from __future__ import annotations

import asyncio
import logging
import time
import uuid

import httpx

from app.connectors.ams_backend import AmsBackendClient
from app.connectors.openrouter import OpenRouterClient
from app.models.user_context import UserContext
from app.retrieval.qdrant_service import QdrantRetrievalService
from app.services.router_service import RouterService
from app.core.settings import settings

logger = logging.getLogger(__name__)

# Overall timeout so the endpoint never hangs indefinitely
_REQUEST_TIMEOUT = 25  # seconds


class ChatService:
    def __init__(self) -> None:
        self.router = RouterService()
        self.ams = AmsBackendClient()
        self.qdrant = QdrantRetrievalService()
        self.llm = OpenRouterClient()

    async def handle_message(self, message: str, token: str | None = None) -> dict:
        start = time.perf_counter()
        trace_id = str(uuid.uuid4())
        try:
            return await asyncio.wait_for(
                self._process(message, token, start, trace_id),
                timeout=_REQUEST_TIMEOUT,
            )
        except asyncio.TimeoutError:
            logger.error("handle_message timed out after %ss – trace_id=%s", _REQUEST_TIMEOUT, trace_id)
            return self._resp(trace_id, start, "Xin lỗi, hệ thống phản hồi quá lâu. Vui lòng thử lại.", {})
        except Exception as exc:
            logger.exception("Unexpected error in handle_message – trace_id=%s", trace_id)
            return self._resp(trace_id, start, f"Đã xảy ra lỗi: {exc}", {})

    async def _process(self, message: str, token: str | None, start: float, trace_id: str) -> dict:
        user_data = await self.ams.get_me(token or "anonymous")
        user = UserContext(**user_data)
        auth_token = token or "anonymous"

        # ── Step 1: Use RouterService to classify the intent locally ──
        intent = self.router.resolve(message)
        logger.info("RouterService resolved intent=%s for message=%r – trace_id=%s", intent, message, trace_id)

        # ── Step 2: Direct backend queries — no Rasa / LLM needed ──
        if intent == "direct_today_shift":
            try:
                shift = await self.ams.get_today_shift(auth_token)
                shift_name = shift.get("shift_name", "N/A")
                shift_start = shift.get("start", "?")
                shift_end = shift.get("end", "?")
                msg = f"Hôm nay bạn có ca {shift_name} từ {shift_start} đến {shift_end}."
                return self._resp(trace_id, start, msg, {"shift": shift})
            except Exception as exc:
                logger.exception("get_today_shift failed – trace_id=%s", trace_id)
                return self._resp(trace_id, start, f"Không thể lấy thông tin ca làm việc: {exc}", {})

        if intent == "direct_attendance_today":
            try:
                att = await self.ams.get_attendance_today(auth_token)
                check_in = att.get("check_in", "chưa có")
                check_out = att.get("check_out") or "chưa checkout"
                status = att.get("status", "N/A")
                msg = f"Hôm nay bạn đã check-in lúc {check_in}, check-out: {check_out}. Trạng thái: {status}."
                return self._resp(trace_id, start, msg, {"attendance": att})
            except Exception as exc:
                logger.exception("get_attendance_today failed – trace_id=%s", trace_id)
                return self._resp(trace_id, start, f"Không thể lấy thông tin chấm công: {exc}", {})

        if intent == "direct_request_status":
            try:
                req = await self.ams.get_request_status(auth_token)
                req_type = req.get("request_type", "đơn")
                status = req.get("status", "N/A")
                msg = f"Đơn {req_type} gần nhất của bạn đang ở trạng thái {status}."
                return self._resp(trace_id, start, msg, {"request": req})
            except Exception as exc:
                logger.exception("get_request_status failed – trace_id=%s", trace_id)
                return self._resp(trace_id, start, f"Không thể lấy trạng thái đơn: {exc}", {})

        # ── Step 3: Knowledge search — go straight to Qdrant + LLM ──
        if intent == "knowledge_search":
            try:
                docs = await self.qdrant.search(message, user.role.capitalize())
                if not docs:
                    return self._resp(trace_id, start, "Xin lỗi, mình chưa tìm thấy thông tin liên quan trong cơ sở kiến thức.", {})
                llm = await self.llm.synthesize(
                    system_prompt="Bạn là trợ lý HR. Chỉ trả lời dựa trên facts được cung cấp. Nếu thiếu dữ liệu thì nói chưa đủ dữ liệu.",
                    user_prompt=f"Câu hỏi: {message}\nFacts: {docs}",
                )
                return self._resp(trace_id, start, llm["content"], {"sources": docs, "llm": llm.get("model")})
            except Exception as exc:
                logger.exception("Knowledge search failed – trace_id=%s", trace_id)
                return self._resp(trace_id, start, f"Lỗi tra cứu kiến thức: {exc}", {})

        # ── Step 4: Fallback — forward to Rasa Core ──
        rasa_url = f"{settings.rasa_url.rstrip('/')}/webhooks/rest/webhook"
        payload = {
            "sender": user.user_id,
            "message": message,
            "metadata": {"user": user.model_dump(), "token": token}
        }

        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(rasa_url, json=payload, timeout=20.0)
                r.raise_for_status()
                rasa_responses = r.json()
        except Exception as e:
            logger.warning("Rasa call failed: %s – trace_id=%s", e, trace_id)
            rasa_responses = [{"text": f"Lỗi kết nối Rasa: {str(e)}"}]

        # Combine bot texts
        bot_texts = [resp.get("text", "") for resp in rasa_responses if "text" in resp]
        final_message = "\n".join(bot_texts) if bot_texts else "Xin lỗi, mình không hiểu ý bạn."

        # If Rasa itself triggers [knowledge_search], handle it here too
        if "[knowledge_search]" in final_message:
            final_message = final_message.replace("[knowledge_search]", "").strip()
            try:
                docs = await self.qdrant.search(message, user.role.capitalize())
                llm = await self.llm.synthesize(
                    system_prompt="Bạn là trợ lý HR. Chỉ trả lời dựa trên facts được cung cấp. Nếu thiếu dữ liệu thì nói chưa đủ dữ liệu.",
                    user_prompt=f"Câu hỏi: {message}\nFacts: {docs}",
                )
                final_message = llm["content"]
                return self._resp(trace_id, start, final_message, {"sources": docs, "llm": llm.get("model")})
            except Exception as exc:
                logger.exception("Rasa knowledge fallback failed – trace_id=%s", trace_id)
                return self._resp(trace_id, start, f"Lỗi tra cứu kiến thức: {exc}", {})

        return self._resp(trace_id, start, final_message, {})

    def _resp(self, trace_id: str, start: float, message: str, data: dict, suggestions: list[str] | None = None) -> dict:
        latency_ms = int((time.perf_counter() - start) * 1000)
        return {
            "success": True,
            "message": message,
            "data": data,
            "trace_id": trace_id,
            "latency_ms": latency_ms,
            "suggestions": suggestions or [],
        }
