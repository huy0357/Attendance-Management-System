from __future__ import annotations

import asyncio
import logging
import time
import uuid

import httpx
from unidecode import unidecode

from app.connectors.ams_backend import AmsBackendClient
from app.connectors.openrouter import OpenRouterClient
from app.core.settings import settings
from app.models.user_context import UserContext
from app.retrieval.policy_retrieval_service import PolicyRetrievalService
from app.services.router_service import RouterService

logger = logging.getLogger(__name__)

_REQUEST_TIMEOUT = 25  # seconds


class ChatService:
    def __init__(self) -> None:
        self.router = RouterService()
        self.ams = AmsBackendClient()
        self.policies = PolicyRetrievalService()
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
            logger.error("handle_message timed out after %ss - trace_id=%s", _REQUEST_TIMEOUT, trace_id)
            return self._resp(trace_id, start, "Xin loi, he thong phan hoi qua lau. Vui long thu lai.", {})
        except Exception as exc:
            logger.exception("Unexpected error in handle_message - trace_id=%s", trace_id)
            return self._resp(trace_id, start, f"Da xay ra loi: {exc}", {})

    async def _process(self, message: str, token: str | None, start: float, trace_id: str) -> dict:
        auth_token = token or "anonymous"

        user_context_error: Exception | None = None
        try:
            user_data = await self.ams.get_me(auth_token)
            user = UserContext(**user_data)
        except Exception as exc:
            logger.warning("get_me failed, fallback to anonymous user - trace_id=%s - err=%s", trace_id, exc)
            user_context_error = exc
            user = UserContext(user_id="anonymous", role="EMPLOYEE", department_ids=[], manager_scope=[])

        intent = self.router.resolve(message)
        logger.info("RouterService resolved intent=%s for message=%r - trace_id=%s", intent, message, trace_id)

        if intent == "general_chat":
            general = await self._handle_general_chat(message, user)
            return self._resp(trace_id, start, general, {"mode": "general_chat"})

        if intent == "direct_today_shift":
            try:
                shift = await self.ams.get_today_shift(auth_token, user.employee_id)
                shift_name = shift.get("shift_name", "N/A")
                shift_start = shift.get("start", "?")
                shift_end = shift.get("end", "?")
                msg = f"Hom nay ban co ca {shift_name} tu {shift_start} den {shift_end}."
                return self._resp(trace_id, start, msg, {"shift": shift})
            except Exception as exc:
                logger.exception("get_today_shift failed - trace_id=%s", trace_id)
                fallback = await self._fallback_on_backend_error(message, user, exc)
                return self._resp(trace_id, start, fallback, {"fallback_reason": "shift_api_error"})

        if intent == "direct_attendance_today":
            try:
                att = await self.ams.get_attendance_today(auth_token)
                check_in = att.get("check_in", "chua co")
                check_out = att.get("check_out") or "chua checkout"
                status = att.get("status", "N/A")
                msg = f"Hom nay ban da check-in luc {check_in}, check-out: {check_out}. Trang thai: {status}."
                return self._resp(trace_id, start, msg, {"attendance": att})
            except Exception as exc:
                logger.exception("get_attendance_today failed - trace_id=%s", trace_id)
                fallback = await self._fallback_on_backend_error(message, user, exc)
                return self._resp(trace_id, start, fallback, {"fallback_reason": "attendance_api_error"})

        if intent == "direct_request_status":
            try:
                req = await self.ams.get_request_status(auth_token, user.employee_id)
                req_type = req.get("request_type", "don")
                status = req.get("status", "N/A")
                msg = f"Don {req_type} gan nhat cua ban dang o trang thai {status}."
                return self._resp(trace_id, start, msg, {"request": req})
            except Exception as exc:
                logger.exception("get_request_status failed - trace_id=%s", trace_id)
                fallback = await self._fallback_on_backend_error(message, user, exc)
                return self._resp(trace_id, start, fallback, {"fallback_reason": "request_api_error"})

        if intent == "knowledge_search":
            try:
                docs = self.policies.search(message, user.role)
                if not docs:
                    return self._resp(trace_id, start, "Minh chua tim thay thong tin lien quan trong co so kien thuc.", {})

                llm = await self._safe_llm(
                    system_prompt="Ban la tro ly HR. Chi tra loi dua tren facts duoc cung cap.",
                    user_prompt=f"Cau hoi: {message}\nFacts: {docs}",
                )
                if llm:
                    return self._resp(trace_id, start, llm["content"], {"sources": docs, "llm": llm.get("model")})

                top = docs[0]
                return self._resp(trace_id, start, f"Theo tai lieu: {top.get('content', 'chua du du lieu')}", {"sources": docs})
            except Exception as exc:
                logger.exception("Knowledge search failed - trace_id=%s", trace_id)
                return self._resp(trace_id, start, f"Loi tra cuu kien thuc: {exc}", {})

        rasa_url = f"{settings.rasa_url.rstrip('/')}/webhooks/rest/webhook"
        payload = {
            "sender": user.user_id,
            "message": message,
            "metadata": {"user": user.model_dump(), "token": token},
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(rasa_url, json=payload, timeout=20.0)
                response.raise_for_status()
                rasa_responses = response.json()
        except Exception as exc:
            logger.warning("Rasa call failed: %s - trace_id=%s", exc, trace_id)
            rasa_responses = []

        bot_texts = [resp.get("text", "") for resp in rasa_responses if "text" in resp]
        final_message = "\n".join(bot_texts).strip() if bot_texts else ""

        if "[knowledge_search]" in final_message:
            try:
                docs = self.policies.search(message, user.role)
                llm = await self._safe_llm(
                    system_prompt="Ban la tro ly HR. Chi tra loi dua tren facts duoc cung cap.",
                    user_prompt=f"Cau hoi: {message}\nFacts: {docs}",
                )
                if llm:
                    return self._resp(trace_id, start, llm["content"], {"sources": docs, "llm": llm.get("model")})
                return self._resp(trace_id, start, "Khong the tong hop cau tra loi bang LLM luc nay.", {"sources": docs})
            except Exception as exc:
                logger.exception("Rasa knowledge fallback failed - trace_id=%s", trace_id)
                return self._resp(trace_id, start, f"Loi tra cuu kien thuc: {exc}", {})

        if final_message:
            return self._resp(trace_id, start, final_message, {})

        if user_context_error is not None:
            fallback = await self._fallback_on_backend_error(message, user, user_context_error)
            return self._resp(trace_id, start, fallback, {"fallback_reason": "user_context_error"})

        general = await self._handle_general_chat(message, user)
        return self._resp(trace_id, start, general, {"mode": "general_chat_fallback"})

    async def _handle_general_chat(self, message: str, user: UserContext) -> str:
        identity = self._identity_answer(message, user)
        if identity:
            return identity

        llm = await self._safe_llm(
            system_prompt="Ban la tro ly AMS than thien, tra loi ngan gon, ro rang, tieng Viet.",
            user_prompt=(
                f"Thong tin nguoi dung: user_id={user.user_id}, role={user.role}, employee_id={user.employee_id}.\n"
                f"Cau hoi: {message}"
            ),
        )
        if llm:
            return llm["content"]

        return "Minh co the ho tro tra cuu cham cong, ca lam viec, don tu va giai thich quy trinh trong AMS."

    def _identity_answer(self, message: str, user: UserContext) -> str | None:
        text = unidecode(message.lower())
        if "toi la ai" in text or "vai tro" in text:
            if user.user_id == "anonymous":
                return "Minh chua xac dinh duoc danh tinh cua ban. Vui long dang nhap lai."
            return f"Ban dang dang nhap voi tai khoan {user.user_id}, vai tro {user.role}."
        if "ban la ai" in text:
            return "Minh la tro ly chatbot cua he thong AMS, ho tro tra cuu va huong dan nghiep vu cham cong."
        return None

    async def _fallback_on_backend_error(self, message: str, user: UserContext, error: Exception) -> str:
        llm = await self._safe_llm(
            system_prompt="Ban la tro ly AMS. Neu API backend loi, hay xin loi ngan gon va huong dan nguoi dung dat cau hoi khac.",
            user_prompt=f"Cau hoi: {message}\nLoi backend: {error}",
        )
        if llm:
            return llm["content"]
        return "Minh dang gap loi ket noi du lieu nghiep vu. Ban co the thu lai sau it phut hoac hoi cau hoi khac."

    async def _safe_llm(self, system_prompt: str, user_prompt: str) -> dict | None:
        try:
            return await self.llm.synthesize(system_prompt=system_prompt, user_prompt=user_prompt)
        except Exception as exc:
            logger.warning("LLM synthesize failed: %s", exc)
            return None

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
