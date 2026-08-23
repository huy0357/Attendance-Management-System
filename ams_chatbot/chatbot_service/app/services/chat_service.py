from __future__ import annotations

import asyncio
import logging
import time
import uuid

from datetime import datetime, timedelta
import httpx
from unidecode import unidecode

from app.connectors.ams_backend import AmsBackendClient
from app.connectors.openrouter import OpenRouterClient
from app.core.settings import settings
from app.models.user_context import UserContext
from app.retrieval.qdrant_service import QdrantRetrievalService
from app.services.csv_exporter import CsvExporter
from app.services.router_service import RouterService

logger = logging.getLogger(__name__)

_REQUEST_TIMEOUT = 25  # seconds
_session_histories: dict[str, list[dict]] = {}
_MAX_HISTORY_LEN = 6  # 3 turns (user + assistant)

# ── Permission denied messages ──
_PERM_DENIED_SELF_ONLY = "Bạn chỉ có quyền xem thông tin của chính mình. Nếu cần hỗ trợ thêm, hãy liên hệ quản lý hoặc HR nhé! 🔒"
_PERM_DENIED_DEPT_ONLY = "Bạn chỉ có quyền xem thông tin nhân viên trong phòng ban mình quản lý. 🔒"
_PERM_DENIED_ADMIN_ONLY = "Chức năng này chỉ dành cho Admin hoặc HR. 🔒"


class ChatService:
    def __init__(self) -> None:
        self.router = RouterService()
        self.ams = AmsBackendClient()
        self.policies = QdrantRetrievalService()
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
            return self._resp(trace_id, start, "Xin lỗi, hệ thống phản hồi quá lâu. Vui lòng thử lại.", {})
        except Exception as exc:
            logger.exception("Unexpected error in handle_message - trace_id=%s", trace_id)
            return self._resp(trace_id, start, f"Đã xảy ra lỗi: {exc}", {})

    async def _process(self, message: str, token: str | None, start: float, trace_id: str) -> dict:
        auth_token = token or "anonymous"

        user_context_error: Exception | None = None
        try:
            if not auth_token or auth_token == "anonymous":
                raise ValueError("Missing or anonymous authentication token")

            user_data = await self.ams.get_me(auth_token)
            user = UserContext(**user_data)
        except Exception as exc:
            logger.warning("get_me failed, fallback to anonymous user - trace_id=%s - err=%s", trace_id, exc)
            user_context_error = exc
            user = UserContext(user_id="anonymous", role="GUEST", department_ids=[], manager_scope=[])

        intent = self.router.resolve(message)
        llm_entities: dict | None = None

        # ── LLM fallback: when keyword matching can't determine intent ──
        if intent == "fallback":
            logger.info("Keyword matching returned fallback, trying LLM classify - trace_id=%s", trace_id)
            llm_result = await self.router.classify_with_llm(message)
            intent = llm_result["intent"]
            llm_entities = llm_result
            logger.info("LLM classified intent=%s, target=%s, month=%s - trace_id=%s",
                        intent, llm_result.get("target_name"), llm_result.get("month"), trace_id)

        logger.info("Final intent=%s for message=%r - trace_id=%s", intent, message, trace_id)

        # ── General chat ──
        if intent == "general_chat":
            general = await self._handle_general_chat(message, user)
            return self._resp(trace_id, start, general, {"mode": "general_chat"})

        # ── Today shift ──
        if intent == "direct_today_shift":
            target_name = (llm_entities or {}).get("target_name") or self.router.extract_target_name(message)
            try:
                target_emp_id = user.employee_id
                display_name = "bạn"
                
                if target_name:
                    if not user.can_view_others():
                        return self._resp(trace_id, start, _PERM_DENIED_SELF_ONLY, {})
                        
                    employees = await self.ams.search_employee_by_name(auth_token, target_name)
                    if not employees:
                        return self._resp(trace_id, start, f"Không tìm thấy nhân viên nào có tên **{target_name}**.", {})
                    emp = employees[0]
                    
                    if user.is_manager() and not user.is_admin_or_hr():
                        emp_dept = str(emp.get("departmentId") or emp.get("department_id", ""))
                        if emp_dept and emp_dept not in user.department_ids:
                            return self._resp(trace_id, start, _PERM_DENIED_DEPT_ONLY, {})
                            
                    target_emp_id = str(emp.get("employeeId") or emp.get("id", ""))
                    display_name = f"nhân viên **{emp.get('fullName') or target_name}**"
                
                shift = await self.ams.get_today_shift(auth_token, target_emp_id)
                shift_name = shift.get("shift_name", "N/A")
                shift_start = shift.get("start", "?")
                shift_end = shift.get("end", "?")
                msg = f"Hôm nay {display_name} có ca **{shift_name}** từ **{shift_start}** đến **{shift_end}**."
                return self._resp(trace_id, start, msg, {"shift": shift})
            except Exception as exc:
                logger.exception("get_today_shift failed - trace_id=%s", trace_id)
                fallback = await self._fallback_on_backend_error(message, user, exc)
                return self._resp(trace_id, start, fallback, {"fallback_reason": "shift_api_error"})

        # ── Today / Specific Date attendance ──
        if intent == "direct_attendance_today":
            target_name = (llm_entities or {}).get("target_name") or self.router.extract_target_name(message)
            target_date = self.router.extract_date(message)
            try:
                target_emp_id = user.employee_id
                display_name = "bạn"
                
                if target_name:
                    if not user.can_view_others():
                        return self._resp(trace_id, start, _PERM_DENIED_SELF_ONLY, {})
                        
                    employees = await self.ams.search_employee_by_name(auth_token, target_name)
                    if not employees:
                        return self._resp(trace_id, start, f"Không tìm thấy nhân viên nào có tên **{target_name}**.", {})
                    emp = employees[0]
                    
                    if user.is_manager() and not user.is_admin_or_hr():
                        emp_dept = str(emp.get("departmentId") or emp.get("department_id", ""))
                        if emp_dept and emp_dept not in user.department_ids:
                            return self._resp(trace_id, start, _PERM_DENIED_DEPT_ONLY, {})
                            
                    target_emp_id = str(emp.get("employeeId") or emp.get("id", ""))
                    display_name = f"nhân viên **{emp.get('fullName') or target_name}**"

                today_iso = self.ams._today_local_iso()
                query_date = target_date or today_iso

                if query_date == today_iso and not target_name:
                    att = await self.ams.get_attendance_today(auth_token)
                else:
                    month_str = query_date[:7]
                    rows = await self.ams.get_attendance_monthly(auth_token, target_emp_id, month_str)
                    att = next((r for r in rows if r.get("date") == query_date), {})

                def _fmt_time(val):
                    if not val:
                        return val
                    if "T" in str(val):
                        return str(val).split("T")[1][:8]
                    return str(val)

                check_in = _fmt_time(att.get("check_in")) or "chưa có"
                check_out = _fmt_time(att.get("check_out")) or "chưa checkout"
                status = att.get("status", "N/A")

                # Format friendly date label
                try:
                    d_obj = datetime.strptime(query_date, "%Y-%m-%d")
                    d_formatted = d_obj.strftime("%d/%m/%Y")
                except Exception:
                    d_formatted = query_date

                yesterday_iso = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
                if query_date == today_iso:
                    date_prefix = "Hôm nay"
                elif query_date == yesterday_iso:
                    date_prefix = f"Hôm qua (ngày {d_formatted})"
                else:
                    date_prefix = f"Ngày {d_formatted}"

                msg = f"{date_prefix} {display_name} check-in lúc **{check_in}**, check-out: **{check_out}**. Trạng thái: **{status}**."
                return self._resp(trace_id, start, msg, {"attendance": att})
            except Exception as exc:
                logger.exception("get_attendance_today failed - trace_id=%s", trace_id)
                fallback = await self._fallback_on_backend_error(message, user, exc)
                return self._resp(trace_id, start, fallback, {"fallback_reason": "attendance_api_error"})

        # ── Monthly attendance query ──
        if intent == "query_attendance_month":
            return await self._handle_attendance_month(message, auth_token, user, trace_id, start, llm_entities=llm_entities)

        # ── Yearly attendance query ──
        if intent == "query_attendance_year":
            return await self._handle_attendance_year(message, auth_token, user, trace_id, start, llm_entities=llm_entities)

        # ── Request status ──
        if intent == "direct_request_status":
            try:
                req = await self.ams.get_request_status(auth_token, user.employee_id)
                req_type = req.get("request_type", "đơn")
                status = req.get("status", "N/A")
                msg = f"Đơn **{req_type}** gần nhất của bạn đang ở trạng thái **{status}**."
                return self._resp(trace_id, start, msg, {"request": req})
            except Exception as exc:
                logger.exception("get_request_status failed - trace_id=%s", trace_id)
                fallback = await self._fallback_on_backend_error(message, user, exc)
                return self._resp(trace_id, start, fallback, {"fallback_reason": "request_api_error"})

        # ── Requests list ──
        if intent == "query_requests_list":
            return await self._handle_requests_list(auth_token, user, trace_id, start)

        # ── Leave balance ──
        if intent == "query_leave_balance":
            return await self._handle_leave_balance(message, auth_token, user, trace_id, start)

        # ── My subordinates ──
        if intent == "query_my_subordinates":
            return await self._handle_my_subordinates(auth_token, user, trace_id, start)

        # ── Salary report ──
        if intent == "direct_salary_report":
            msg = "Hệ thống AMS hiện tại chỉ quản lý chấm công và đơn từ, chưa hỗ trợ tính năng xem bảng lương. Bạn vui lòng liên hệ bộ phận Kế toán / Nhân sự để biết thêm chi tiết."
            return self._resp(trace_id, start, msg, {})

        # ── Attendance report (existing) ──
        if intent == "direct_attendance_report":
            url = self.ams.get_attendance_report_url(auth_token, user.employee_id)
            msg = f"Bạn có thể tải báo cáo chấm công của mình tại đây: [Báo Cáo Chấm Công]({url})."
            return self._resp(trace_id, start, msg, {"report_url": url})

        # ── Employee info ──
        if intent == "query_employee_info":
            return await self._handle_employee_info(message, auth_token, user, trace_id, start, llm_entities)

        # ── Employee list ──
        if intent == "query_employee_list":
            return await self._handle_employee_list(auth_token, user, trace_id, start)

        # ── Department list ──
        if intent == "query_department_list":
            return await self._handle_department_list(auth_token, user, trace_id, start)

        # ── Export CSV intents ──
        if intent == "export_attendance_csv":
            return await self._handle_export_attendance_csv(message, auth_token, user, trace_id, start)
        if intent == "export_employee_csv":
            return await self._handle_export_employee_csv(auth_token, user, trace_id, start)
        if intent == "export_requests_csv":
            return await self._handle_export_requests_csv(auth_token, user, trace_id, start)

        # ── Knowledge search ──
        if intent == "knowledge_search":
            try:
                docs = await self.policies.search(message, user.role)
                if not docs:
                    return self._resp(trace_id, start, "Mình chưa tìm thấy thông tin liên quan trong cơ sở kiến thức.", {})

                llm = await self._safe_llm(
                    user.user_id,
                    system_prompt="Ban la tro ly HR. Chi tra loi dua tren facts duoc cung cap. Neu co external_links trong facts, hay trich dan bang Markdown link. KHONG tu bia du lieu.",
                    user_prompt=f"Cau hoi: {message}\nFacts: {docs}",
                )
                if llm:
                    return self._resp(trace_id, start, llm["content"], {"sources": docs, "llm": llm.get("model")})

                top = docs[0]
                return self._resp(trace_id, start, f"Theo tài liệu: {top.get('content', 'chưa đủ dữ liệu')}", {"sources": docs})
            except Exception as exc:
                logger.exception("Knowledge search failed - trace_id=%s", trace_id)
                return self._resp(trace_id, start, f"Lỗi tra cứu kiến thức: {exc}", {})

        # ── Rasa fallback ──
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
                docs = await self.policies.search(message, user.role)
                llm = await self._safe_llm(
                    user.user_id,
                    system_prompt="Ban la tro ly HR. Chi tra loi dua tren facts duoc cung cap. Neu co external_links, hay trich dan bang Markdown link. KHONG tu bia du lieu.",
                    user_prompt=f"Cau hoi: {message}\nFacts: {docs}",
                )
                if llm:
                    return self._resp(trace_id, start, llm["content"], {"sources": docs, "llm": llm.get("model")})
                return self._resp(trace_id, start, "Không thể tổng hợp câu trả lời bằng LLM lúc này.", {"sources": docs})
            except Exception as exc:
                logger.exception("Rasa knowledge fallback failed - trace_id=%s", trace_id)
                return self._resp(trace_id, start, f"Lỗi tra cứu kiến thức: {exc}", {})

        if final_message:
            return self._resp(trace_id, start, final_message, {})

        if user_context_error is not None:
            fallback = await self._fallback_on_backend_error(message, user, user_context_error)
            return self._resp(trace_id, start, fallback, {"fallback_reason": "user_context_error"})

        # ── Fallback: try RAG knowledge search before giving up ──
        try:
            docs = await self.policies.search(message, user.role)
            if docs:
                llm = await self._safe_llm(
                    user.user_id,
                    system_prompt="Bạn là trợ lý HR của hệ thống AMS. CHỈ trả lời dựa trên facts được cung cấp. Nếu facts không liên quan đến câu hỏi, hãy nói rằng bạn không tìm thấy thông tin và gợi ý các chức năng hệ thống. KHÔNG tự bịa dữ liệu. KHÔNG trả lời các câu hỏi ngoài phạm vi hệ thống AMS.",
                    user_prompt=f"Câu hỏi: {message}\nFacts: {docs}",
                )
                if llm:
                    return self._resp(trace_id, start, llm["content"], {"sources": docs, "llm": llm.get("model")})
        except Exception:
            logger.warning("Fallback RAG search failed - trace_id=%s", trace_id)

        general = await self._handle_general_chat(message, user)
        return self._resp(trace_id, start, general, {"mode": "general_chat_fallback"})

    # ═══════════════════════════════════════════════
    # NEW INTENT HANDLERS
    # ═══════════════════════════════════════════════

    async def _handle_leave_balance(self, message: str, token: str, user: UserContext, trace_id: str, start: float) -> dict:
        """Handle leave balance query for the user or a specific employee."""
        try:
            current_year = datetime.now().year
            standard_leave_days = 12

            # Check if asking about another employee
            target_name = self.router.extract_target_name(message)
            target_emp_id = user.employee_id
            display_name = user.full_name or user.user_id

            if target_name:
                if not user.can_view_others():
                    return self._resp(trace_id, start, _PERM_DENIED_SELF_ONLY, {})
                employees = await self.ams.search_employee_by_name(token, target_name)
                if not employees:
                    return self._resp(trace_id, start, f"Không tìm thấy nhân viên nào có tên **{target_name}**.", {})
                emp = employees[0]
                if user.is_manager() and not user.is_admin_or_hr():
                    emp_dept = str(emp.get("departmentId") or emp.get("department_id", ""))
                    if emp_dept and emp_dept not in user.department_ids:
                        return self._resp(trace_id, start, _PERM_DENIED_DEPT_ONLY, {})
                target_emp_id = str(emp.get("employeeId") or emp.get("id", ""))
                display_name = emp.get("fullName") or target_name

            used_days = 0
            pending_days = 0

            if target_emp_id:
                data = await self.ams.get_my_requests(token, target_emp_id, size=100)
                items = data.get("items") or data.get("content") or []

                for req in items:
                    req_type = str(req.get("requestType") or req.get("request_type") or "").upper()
                    status = str(req.get("status") or "").upper()
                    start_dt = str(req.get("startDatetime") or req.get("start_datetime") or "")

                    if req_type == "LEAVE" and (not start_dt or str(current_year) in start_dt):
                        if status == "APPROVED":
                            used_days += 1
                        elif status in ["PENDING", "DRAFT"]:
                            pending_days += 1

            remaining_days = max(0, standard_leave_days - used_days)
            owner_label = "của bạn" if not target_name else f"của **{display_name}**"

            msg = (
                f"🌴 **Thông tin ngày nghỉ phép năm {current_year} {owner_label}:**\n\n"
                f"- **Nhân viên:** {display_name} (Mã NV: {target_emp_id})\n"
                f"- **Tiêu chuẩn phép năm:** **{standard_leave_days} ngày**\n"
                f"- **Số ngày phép đã nghỉ (Đã duyệt):** **{used_days} ngày**\n"
                f"- **Đang chờ duyệt:** **{pending_days} ngày**\n"
                f"- **Số ngày phép còn lại:** **{remaining_days} ngày**\n\n"
                f"💡 *Theo quy định, mỗi nhân viên chính thức có {standard_leave_days} ngày phép có lương/năm và được chuyển tối đa 5 ngày sang năm tiếp theo.*"
            )
            return self._resp(trace_id, start, msg, {
                "total_standard": standard_leave_days,
                "used_days": used_days,
                "pending_days": pending_days,
                "remaining_days": remaining_days,
                "year": current_year
            }, suggestions=["Danh sách đơn", "Quy định nghỉ phép"])

        except Exception as exc:
            logger.exception("Leave balance query failed - trace_id=%s", trace_id)
            return self._resp(trace_id, start, f"Lỗi truy vấn ngày phép: {exc}", {})

    async def _handle_my_subordinates(self, token: str, user: UserContext, trace_id: str, start: float) -> dict:
        """Handle 'who are my subordinates / who can I view' queries."""
        if user.role == "EMPLOYEE":
            return self._resp(trace_id, start,
                "Bạn đang có vai trò **Nhân viên**, chỉ có quyền xem thông tin của chính mình. "
                "Nếu cần xem thông tin người khác, hãy liên hệ quản lý hoặc HR nhé! 🔒", {})

        if user.is_admin_or_hr():
            return self._resp(trace_id, start,
                f"Bạn đang có vai trò **{user.role}** nên có quyền xem thông tin của **tất cả nhân viên** trong hệ thống. "
                "Hãy hỏi trực tiếp, ví dụ: _\"chấm công của Nguyễn Văn A tháng 7\"_ hoặc _\"danh sách nhân viên\"_. 🔓",
                {}, suggestions=["Danh sách nhân viên", "Xuất CSV nhân viên"])

        # MANAGER: query actual subordinates from department
        if user.is_manager():
            try:
                all_subordinates: list[dict] = []
                for dept_id in user.department_ids:
                    emps = await self.ams.get_department_employees(token, dept_id)
                    all_subordinates.extend(emps)

                # Remove self from list
                subordinates = [
                    e for e in all_subordinates
                    if str(e.get("employeeId") or e.get("employee_id", "")) != str(user.employee_id)
                ]

                if not subordinates:
                    return self._resp(trace_id, start,
                        f"Bạn là quản lý phòng **{user.department_name or 'N/A'}** nhưng hiện tại chưa có nhân viên nào trong phòng ban.", {})

                msg = f"👥 **Nhân viên thuộc quyền quản lý của bạn** ({len(subordinates)} người):\n\n"
                msg += "| # | Họ tên | Mã NV | Email |\n"
                msg += "|---|--------|-------|-------|\n"
                for i, emp in enumerate(subordinates[:20], 1):
                    name = emp.get("fullName") or emp.get("full_name", "")
                    code = emp.get("employeeCode") or emp.get("employee_code", "")
                    email = emp.get("email", "")
                    msg += f"| {i} | {name} | {code} | {email} |\n"

                if len(subordinates) > 20:
                    msg += f"\n*...và {len(subordinates) - 20} nhân viên khác.*\n"

                msg += f"\n💡 Bạn có thể xem **chấm công**, **bảng lương** của các nhân viên trên. Ví dụ: _\"chấm công của {subordinates[0].get('fullName', 'Nguyễn Văn A')} tháng 8\"_"

                return self._resp(trace_id, start, msg, {"subordinates_count": len(subordinates)},
                                  suggestions=["Xuất CSV chấm công"])

            except Exception as exc:
                logger.exception("Subordinates query failed - trace_id=%s", trace_id)
                return self._resp(trace_id, start, f"Lỗi truy vấn danh sách cấp dưới: {exc}", {})

        # Fallback
        return self._resp(trace_id, start, "Không xác định được quyền quản lý của bạn.", {})

    async def _handle_attendance_month(self, message: str, token: str, user: UserContext, trace_id: str, start: float, llm_entities: dict | None = None) -> dict:
        """Handle monthly attendance query with role-based access."""
        month = self.router.extract_month(message) or (llm_entities or {}).get("month")
        target_name = self.router.extract_target_name(message) or (llm_entities or {}).get("target_name")

        try:
            if target_name and not user.can_view_others():
                return self._resp(trace_id, start, _PERM_DENIED_SELF_ONLY, {})

            if target_name and user.can_view_others():
                # Search for the target employee
                employees = await self.ams.search_employee_by_name(token, target_name)
                if not employees:
                    return self._resp(trace_id, start, f"Không tìm thấy nhân viên nào có tên **{target_name}**.", {})
                emp = employees[0]
                target_id = str(emp.get("employeeId") or emp.get("employee_id"))
                target_full_name = emp.get("fullName") or emp.get("full_name") or target_name

                # MANAGER: check department
                if user.is_manager() and not user.is_admin_or_hr():
                    emp_dept = str(emp.get("departmentId") or emp.get("department_id", ""))
                    if emp_dept and emp_dept not in user.department_ids:
                        return self._resp(trace_id, start, _PERM_DENIED_DEPT_ONLY, {})

                rows = await self.ams.get_attendance_monthly(token, target_id, month)
                display_month = month or "tháng hiện tại"
                msg = self._format_attendance_table(rows, target_full_name, display_month)
                return self._resp(trace_id, start, msg, {"attendance_count": len(rows)},
                                  suggestions=["Xuất CSV chấm công"] if len(rows) > 5 else [])

            # Self query
            if not user.employee_id:
                return self._resp(trace_id, start, "Không xác định được mã nhân viên. Vui lòng đăng nhập lại.", {})
            rows = await self.ams.get_attendance_monthly(token, user.employee_id, month)
            display_month = month or "tháng hiện tại"
            display_name = user.full_name or user.user_id
            msg = self._format_attendance_table(rows, display_name, display_month)
            return self._resp(trace_id, start, msg, {"attendance_count": len(rows)},
                              suggestions=["Xuất Excel chấm công"] if len(rows) > 5 else [])

        except Exception as exc:
            logger.exception("Attendance month query failed - trace_id=%s", trace_id)
            fallback = await self._fallback_on_backend_error(message, user, exc)
            return self._resp(trace_id, start, fallback, {"fallback_reason": "attendance_month_error"})

    async def _handle_attendance_year(self, message: str, token: str, user: UserContext, trace_id: str, start: float, llm_entities: dict | None = None) -> dict:
        """Handle yearly attendance summary with role-based access."""
        target_name = self.router.extract_target_name(message) or (llm_entities or {}).get("target_name")
        target_year = self.router.extract_year(message) or datetime.now().year

        try:
            target_emp_id = user.employee_id
            display_name = user.full_name or user.user_id

            if target_name:
                if not user.can_view_others():
                    return self._resp(trace_id, start, _PERM_DENIED_SELF_ONLY, {})
                employees = await self.ams.search_employee_by_name(token, target_name)
                if not employees:
                    return self._resp(trace_id, start, f"Không tìm thấy nhân viên nào có tên **{target_name}**.", {})
                emp = employees[0]
                if user.is_manager() and not user.is_admin_or_hr():
                    emp_dept = str(emp.get("departmentId") or emp.get("department_id", ""))
                    if emp_dept and emp_dept not in user.department_ids:
                        return self._resp(trace_id, start, _PERM_DENIED_DEPT_ONLY, {})
                target_emp_id = str(emp.get("employeeId") or emp.get("id", ""))
                display_name = emp.get("fullName") or target_name

            if not target_emp_id:
                return self._resp(trace_id, start, "Không xác định được mã nhân viên. Vui lòng đăng nhập lại.", {})

            rows = await self.ams.get_attendance_yearly(token, target_emp_id, target_year)

            # Aggregate by month
            now = datetime.now()
            is_current_year = target_year == now.year
            monthly_stats: dict[str, dict] = {}
            total_present = 0
            total_late = 0
            total_absent = 0
            total_days = 0

            for r in rows:
                date_str = r.get("date", "")
                status = (r.get("status") or "").upper()
                if not date_str:
                    continue
                month_key = date_str[:7]  # "2026-01"
                if month_key not in monthly_stats:
                    monthly_stats[month_key] = {"present": 0, "late": 0, "absent": 0, "total": 0}
                monthly_stats[month_key]["total"] += 1
                total_days += 1
                if status in ("PRESENT", "ON_TIME"):
                    monthly_stats[month_key]["present"] += 1
                    total_present += 1
                elif status in ("LATE", "LATE_IN", "EARLY_OUT"):
                    monthly_stats[month_key]["late"] += 1
                    total_late += 1
                elif status in ("ABSENT", "NO_SHOW"):
                    monthly_stats[month_key]["absent"] += 1
                    total_absent += 1
                else:
                    # Count other statuses as present (e.g. LEAVE, HOLIDAY)
                    monthly_stats[month_key]["present"] += 1
                    total_present += 1

            owner_label = "của bạn" if not target_name else f"của **{display_name}**"
            cutoff_label = f" (tính đến {now.strftime('%d/%m/%Y')})" if is_current_year else ""

            msg = f"📊 **Tổng kết công năm {target_year} {owner_label}**{cutoff_label}:\n\n"
            msg += f"**Nhân viên:** {display_name}\n\n"

            if not monthly_stats:
                msg += "⚠️ Chưa có dữ liệu chấm công trong năm này.\n"
            else:
                # Monthly breakdown table
                msg += "| Tháng | Ngày công | Đúng giờ | Đi trễ | Vắng |\n"
                msg += "|-------|-----------|----------|--------|------|\n"
                for mk in sorted(monthly_stats.keys()):
                    s = monthly_stats[mk]
                    month_label = mk  # "2026-01"
                    msg += f"| {month_label} | {s['total']} | {s['present']} | {s['late']} | {s['absent']} |\n"

                msg += f"\n📈 **Tổng kết cả năm{cutoff_label}:**\n"
                msg += f"- **Tổng ngày công:** {total_days} ngày\n"
                msg += f"- **Đúng giờ:** {total_present} ngày\n"
                if total_late:
                    msg += f"- **Đi trễ:** {total_late} ngày\n"
                msg += f"- **Vắng:** {total_absent} ngày\n"

                if total_days > 0:
                    rate = round((total_present + total_late) / total_days * 100, 1)
                    msg += f"- **Tỷ lệ đi làm:** {rate}%\n"

            return self._resp(trace_id, start, msg, {
                "year": target_year,
                "total_days": total_days,
                "total_present": total_present,
                "total_late": total_late,
                "total_absent": total_absent,
                "monthly_stats": monthly_stats,
            }, suggestions=["Xuất Excel chấm công", "Ngày phép còn lại"])

        except Exception as exc:
            logger.exception("Attendance year query failed - trace_id=%s", trace_id)
            fallback = await self._fallback_on_backend_error(message, user, exc)
            return self._resp(trace_id, start, fallback, {"fallback_reason": "attendance_year_error"})

    async def _handle_employee_info(self, message: str, token: str, user: UserContext, trace_id: str, start: float, llm_entities: dict | None = None) -> dict:
        """Handle employee info query with role-based access."""
        target_name = self.router.extract_target_name(message) or (llm_entities or {}).get("target_name")

        try:
            if target_name:
                if not user.can_view_others():
                    return self._resp(trace_id, start, _PERM_DENIED_SELF_ONLY, {})

                employees = await self.ams.search_employee_by_name(token, target_name)
                if not employees:
                    return self._resp(trace_id, start, f"Không tìm thấy nhân viên nào có tên **{target_name}**.", {})
                emp = employees[0]

                # MANAGER: check department
                if user.is_manager() and not user.is_admin_or_hr():
                    emp_dept = str(emp.get("departmentId") or emp.get("department_id", ""))
                    if emp_dept and emp_dept not in user.department_ids:
                        return self._resp(trace_id, start, _PERM_DENIED_DEPT_ONLY, {})

                msg = self._format_employee_info(emp)
                return self._resp(trace_id, start, msg, {"employee": emp})

            # Self info
            if not user.employee_id:
                return self._resp(trace_id, start, "Không xác định được mã nhân viên. Vui lòng đăng nhập lại.", {})
            emp = await self.ams.get_employee_info(token, user.employee_id)
            msg = self._format_employee_info(emp)
            return self._resp(trace_id, start, msg, {"employee": emp})

        except Exception as exc:
            logger.exception("Employee info query failed - trace_id=%s", trace_id)
            fallback = await self._fallback_on_backend_error(message, user, exc)
            return self._resp(trace_id, start, fallback, {"fallback_reason": "employee_info_error"})

    async def _handle_employee_list(self, token: str, user: UserContext, trace_id: str, start: float) -> dict:
        """Handle employee list query (ADMIN/HR only)."""
        if not user.is_admin_or_hr():
            return self._resp(trace_id, start, _PERM_DENIED_ADMIN_ONLY, {})

        try:
            employees = await self.ams.get_all_employees(token)
            if not employees:
                return self._resp(trace_id, start, "Không có nhân viên nào trong hệ thống.", {})

            msg = f"📋 **Danh sách nhân viên** ({len(employees)} người):\n\n"
            msg += "| # | Họ tên | Mã NV | Email | Phòng ban | Trạng thái |\n"
            msg += "|---|--------|-------|-------|-----------|------------|\n"
            for i, emp in enumerate(employees[:5], 1):
                name = emp.get("fullName") or emp.get("full_name", "")
                code = emp.get("employeeCode") or emp.get("employee_code", "")
                email = emp.get("email", "")
                dept = emp.get("departmentName") or emp.get("department_name", "")
                status = emp.get("status", "")
                msg += f"| {i} | {name} | {code} | {email} | {dept} | {status} |\n"

            if len(employees) > 5:
                msg += f"\n*...và {len(employees) - 5} nhân viên khác.*\n"

            msg += "\n💡 **Gợi ý:** Nhập `xuất excel nhân viên` để tải file đầy đủ."
            return self._resp(trace_id, start, msg, {"total_employees": len(employees)},
                              suggestions=["Xuất Excel nhân viên"])

        except Exception as exc:
            logger.exception("Employee list query failed - trace_id=%s", trace_id)
            return self._resp(trace_id, start, f"Lỗi truy vấn danh sách nhân viên: {exc}", {})

    async def _handle_requests_list(self, token: str, user: UserContext, trace_id: str, start: float) -> dict:
        """Handle requests list query."""
        try:
            if user.is_admin_or_hr():
                data = await self.ams.get_all_requests(token)
            else:
                if not user.employee_id:
                    return self._resp(trace_id, start, "Không xác định được mã nhân viên.", {})
                data = await self.ams.get_my_requests(token, user.employee_id, size=100)

            items = data.get("items") or data.get("content") or []
            if not items:
                return self._resp(trace_id, start, "Không có đơn từ nào.", {})

            label = "tất cả" if user.is_admin_or_hr() else "của bạn"
            msg = f"📝 **Danh sách đơn từ {label}** ({len(items)} đơn):\n\n"
            msg += "| # | Loại đơn | Trạng thái | Ngày nộp | Lý do |\n"
            msg += "|---|----------|------------|----------|-------|\n"
            for i, req in enumerate(items, 1):
                rtype = req.get("requestType") or req.get("type", "")
                status = req.get("status", "")
                submitted_raw = req.get("submittedAt") or req.get("submitted_at") or ""
                submitted = str(submitted_raw)
                try:
                    if "T" in str(submitted_raw):
                        d_part, t_part = str(submitted_raw).split("T")
                        y, m, d = d_part.split("-")
                        submitted = f"{d}/{m}/{y} lúc {t_part[:5]}"
                except Exception:
                    pass
                reason = (req.get("reason") or "").replace("|", "-").replace("\n", " ").strip()
                # Use expandable marker for long reasons
                if len(reason) > 40:
                    short = reason[:38]
                    reason_cell = f"{short}..[xem thêm](#expand:{reason})"
                else:
                    reason_cell = reason or "Không có"
                msg += f"| {i} | {rtype} | {status} | {submitted} | {reason_cell} |\n"

            return self._resp(trace_id, start, msg, {"total_requests": len(items)},
                              suggestions=["Xuất Excel đơn từ"])

        except Exception as exc:
            logger.exception("Requests list query failed - trace_id=%s", trace_id)
            return self._resp(trace_id, start, f"Lỗi truy vấn danh sách đơn từ: {exc}", {})

    async def _handle_department_list(self, token: str, user: UserContext, trace_id: str, start: float) -> dict:
        """Handle department list query."""
        try:
            departments = await self.ams.get_departments(token)
            if not departments:
                return self._resp(trace_id, start, "Không có phòng ban nào trong hệ thống.", {})

            msg = f"🏢 **Danh sách phòng ban** ({len(departments)} phòng):\n\n"
            msg += "| # | Tên phòng ban | Mã PB |\n"
            msg += "|---|---------------|-------|\n"
            for i, dept in enumerate(departments, 1):
                name = dept.get("departmentName") or dept.get("department_name", "")
                code = dept.get("departmentCode") or dept.get("department_code", "")
                msg += f"| {i} | {name} | {code} |\n"

            return self._resp(trace_id, start, msg, {"total_departments": len(departments)})

        except Exception as exc:
            logger.exception("Department list query failed - trace_id=%s", trace_id)
            return self._resp(trace_id, start, f"Lỗi truy vấn danh sách phòng ban: {exc}", {})

    # ═══════════════════════════════════════════════
    # EXPORT CSV HANDLERS
    # ═══════════════════════════════════════════════

    async def _handle_export_attendance_csv(self, message: str, token: str, user: UserContext, trace_id: str, start: float) -> dict:
        """Export attendance data to CSV."""
        month = self.router.extract_month(message)
        text = unidecode(message.lower())
        is_all_explicit = any(k in text for k in ["tat ca", "toan bo", "toan cong ty", "toan the", "tat ca nhan vien", "toan bo nhan vien", "tong hop"])

        try:
            target_name = self.router.extract_target_name(message)
            target_emp_id = user.employee_id
            display_name = user.full_name or (f"Nhân viên {user.employee_id}" if user.employee_id else "Bạn")

            if target_name:
                if not user.can_view_others():
                    return self._resp(trace_id, start, _PERM_DENIED_SELF_ONLY, {})
                employees = await self.ams.search_employee_by_name(token, target_name)
                if not employees:
                    return self._resp(trace_id, start, f"Không tìm thấy nhân viên nào có tên **{target_name}**.", {})
                emp = employees[0]
                if user.is_manager() and not user.is_admin_or_hr():
                    emp_dept = str(emp.get("departmentId") or emp.get("department_id", ""))
                    if emp_dept and emp_dept not in user.department_ids:
                        return self._resp(trace_id, start, _PERM_DENIED_DEPT_ONLY, {})
                target_emp_id = str(emp.get("employeeId") or emp.get("id", ""))
                display_name = emp.get("fullName") or target_name

            # Check if user explicitly asked to export for all employees (ADMIN/HR only)
            if is_all_explicit and user.is_admin_or_hr() and not target_name:
                display_month = month or "tháng hiện tại"
                xlsx_url = self.ams.get_attendance_monthly_export_url(month)
                msg = (
                    f"✅ Đã tạo file Excel bảng chấm công **toàn công ty** ({display_month}):\n\n"
                    f"📊 [Tải file Excel (.xlsx)]({xlsx_url})"
                )
                return self._resp(trace_id, start, msg, {"xlsx_url": xlsx_url})

            # Default: Export personal detailed daily attendance for the requested employee (self)
            if not target_emp_id:
                return self._resp(trace_id, start, "Không xác định được mã nhân viên.", {})

            display_month = month or "tháng hiện tại"
            xlsx_url = self.ams.get_attendance_report_url(token, target_emp_id, month)

            msg = (
                f"✅ Đã tạo file Excel bảng chấm công chi tiết **{display_name}** ({display_month}):\n\n"
                f"📊 [Tải file Excel (.xlsx)]({xlsx_url})"
            )

            return self._resp(trace_id, start, msg, {"xlsx_url": xlsx_url})

        except Exception as exc:
            logger.exception("Export attendance Excel failed - trace_id=%s", trace_id)
            return self._resp(trace_id, start, f"Lỗi xuất file chấm công: {exc}", {})

    async def _handle_export_employee_csv(self, token: str, user: UserContext, trace_id: str, start: float) -> dict:
        """Export employee list to Excel."""
        if not user.is_admin_or_hr():
            return self._resp(trace_id, start, _PERM_DENIED_ADMIN_ONLY, {})

        try:
            xlsx_url = self.ams.get_employees_export_url()
            msg = (
                f"✅ Đã tạo file Excel danh sách nhân viên:\n\n"
                f"📊 [Tải file Excel (.xlsx)]({xlsx_url})"
            )
            return self._resp(trace_id, start, msg, {"xlsx_url": xlsx_url})

        except Exception as exc:
            logger.exception("Export employee Excel failed - trace_id=%s", trace_id)
            return self._resp(trace_id, start, f"Lỗi xuất danh sách nhân viên: {exc}", {})

    async def _handle_export_requests_csv(self, token: str, user: UserContext, trace_id: str, start: float) -> dict:
        """Export requests - show full list since backend has no request export endpoint."""
        if not user.employee_id:
            return self._resp(trace_id, start, "Không xác định được mã nhân viên.", {})

        try:
            data = await self.ams.get_my_requests(token, user.employee_id, size=100)
            items = data.get("items") or data.get("content") or []

            if not items:
                return self._resp(trace_id, start, "Bạn chưa có đơn từ nào trong hệ thống.", {})

            display_name = user.full_name or user.user_id
            msg = f"📋 **Danh sách đơn từ của {display_name}** ({len(items)} đơn):\n\n"
            msg += "| # | Loại đơn | Trạng thái | Ngày nộp | Lý do |\n"
            msg += "|---|----------|------------|----------|-------|\n"

            for i, req in enumerate(items, 1):
                req_type = req.get("requestType") or req.get("request_type") or "N/A"
                status = req.get("status") or "N/A"
                submitted = req.get("submittedAt") or req.get("startDatetime") or ""
                if submitted and "T" in str(submitted):
                    parts = str(submitted).split("T")
                    try:
                        d = datetime.strptime(parts[0], "%Y-%m-%d")
                        submitted = d.strftime("%d/%m/%Y") + " lúc " + parts[1][:5]
                    except Exception:
                        pass
                reason = (str(req.get("reason") or "")).replace("|", "-").replace("\n", " ").strip()
                if len(reason) > 40:
                    short = reason[:38]
                    reason_cell = f"{short}..[xem thêm](#expand:{reason})"
                else:
                    reason_cell = reason or "Không có"
                msg += f"| {i} | {req_type} | {status} | {submitted} | {reason_cell} |\n"

            msg += "\n⚠️ *Hệ thống hiện chưa hỗ trợ xuất file Excel đơn từ. Trên đây là danh sách đầy đủ.*"

            return self._resp(trace_id, start, msg, {"total_requests": len(items)},
                              suggestions=["Xuất Excel chấm công", "Trạng thái đơn gần nhất"])

        except Exception as exc:
            logger.exception("Export requests failed - trace_id=%s", trace_id)
            return self._resp(trace_id, start, f"Lỗi xuất báo cáo đơn từ: {exc}", {})

    # ═══════════════════════════════════════════════
    # FORMATTING HELPERS
    # ═══════════════════════════════════════════════

    def _format_attendance_table(self, rows: list[dict], name: str, month: str) -> str:
        """Format attendance data as a Markdown table."""
        if not rows:
            return f"Không có dữ liệu chấm công **{month}** cho **{name}**."

        # Count stats
        total = len(rows)
        present = sum(1 for r in rows if r.get("status") in ("PRESENT", "ON_TIME"))
        late = sum(1 for r in rows if r.get("status") == "LATE")
        absent = sum(1 for r in rows if r.get("status") in ("ABSENT", "NO_RECORD"))

        msg = f"📊 **Bảng chấm công {month}** của **{name}**:\n\n"
        msg += "| Ngày | Check-in | Check-out | Trạng thái |\n"
        msg += "|------|----------|-----------|------------|\n"

        def _fmt_cell_time(val):
            if not val or val == "—":
                return "—"
            s = str(val)
            if "T" in s:
                return s.split("T")[1][:8]
            return s

        display_rows = rows[:5]
        for r in display_rows:
            date = r.get("date", "")
            ci = _fmt_cell_time(r.get("check_in"))
            co = _fmt_cell_time(r.get("check_out"))
            status = r.get("status", "")
            msg += f"| {date} | {ci} | {co} | {status} |\n"

        if total > 5:
            msg += f"\n*...và {total - 5} ngày khác.*\n"

        msg += f"\n📈 **Tổng kết:** {total} ngày công"
        if present:
            msg += f", {present} ngày đúng giờ"
        if late:
            msg += f", {late} ngày đi trễ"
        if absent:
            msg += f", {absent} ngày vắng"
        msg += "."

        if total > 5:
            msg += "\n\n💡 **Gợi ý:** Nhập `xuất excel chấm công` để tải file đầy đủ."

        return msg

    def _format_employee_info(self, emp: dict) -> str:
        """Format employee info in a readable way."""
        name = emp.get("fullName") or emp.get("full_name", "N/A")
        code = emp.get("employeeCode") or emp.get("employee_code", "")
        email = emp.get("email", "")
        phone = emp.get("phone", "")
        dept = emp.get("departmentName") or emp.get("department_name", "")
        status = emp.get("status", "")
        hire_date = emp.get("hireDate") or emp.get("hire_date", "")
        gender = emp.get("gender", "")

        msg = f"👤 **Thông tin nhân viên: {name}**\n\n"
        msg += f"| Trường | Giá trị |\n"
        msg += f"|--------|--------|\n"
        msg += f"| Mã NV | {code} |\n"
        msg += f"| Họ tên | {name} |\n"
        if email:
            msg += f"| Email | {email} |\n"
        if phone:
            msg += f"| SĐT | {phone} |\n"
        if gender:
            msg += f"| Giới tính | {gender} |\n"
        if dept:
            msg += f"| Phòng ban | {dept} |\n"
        if hire_date:
            msg += f"| Ngày vào | {hire_date} |\n"
        if status:
            msg += f"| Trạng thái | {status} |\n"

        return msg

    # ═══════════════════════════════════════════════
    # EXISTING HELPERS (preserved)
    # ═══════════════════════════════════════════════

    async def _handle_general_chat(self, message: str, user: UserContext) -> str:
        identity = self._identity_answer(message, user)
        if identity:
            return identity

        # RAG-only mode: không trả lời câu hỏi ngoài phạm vi hệ thống
        return (
            "Xin lỗi, mình chỉ hỗ trợ các nghiệp vụ trong hệ thống AMS thôi ạ 🤖\n\n"
            "Mình có thể giúp bạn:\n"
            "• **Chấm công**: _chấm công hôm nay_, _chấm công tháng 7_\n"
            "• **Ca làm việc**: _ca hôm nay_, _lịch làm việc_\n"
            "• **Đơn từ**: _trạng thái đơn_, _danh sách đơn từ_\n"
            "• **Thông tin NV**: _thông tin cá nhân_, _danh sách nhân viên_\n"
            "• **Quy định**: _quy định nghỉ phép_, _chính sách OT_\n"
            "• **Xuất báo cáo**: _xuất csv chấm công_, _xuất csv nhân viên_\n\n"
            "Bạn hãy thử hỏi một trong những câu trên nhé! 💡"
        )

    def _identity_answer(self, message: str, user: UserContext) -> str | None:
        text = unidecode(message.lower())
        if "toi la ai" in text or "vai tro" in text:
            if user.user_id == "anonymous":
                return "Mình chưa xác định được danh tính của bạn. Vui lòng đăng nhập lại."
            name_display = user.full_name or user.user_id
            return f"Bạn đang đăng nhập với tài khoản **{name_display}**, vai trò **{user.role}**."
        if "ban la ai" in text:
            return "Mình là trợ lý chatbot của hệ thống AMS, hỗ trợ tra cứu và hướng dẫn nghiệp vụ chấm công. 🤖"
        return None

    async def _fallback_on_backend_error(self, message: str, user: UserContext, error: Exception) -> str:
        llm = await self._safe_llm(
            user.user_id,
            system_prompt="Ban la tro ly AMS. Neu API backend loi, hay xin loi ngan gon va huong dan nguoi dung dat cau hoi khac.",
            user_prompt=f"Cau hoi: {message}\nLoi backend: {error}",
        )
        if llm:
            return llm["content"]
        return "Mình đang gặp lỗi kết nối dữ liệu nghiệp vụ. Bạn có thể thử lại sau ít phút hoặc hỏi câu hỏi khác."

    async def _safe_llm(self, session_id: str, system_prompt: str, user_prompt: str) -> dict | None:
        try:
            history = _session_histories.get(session_id, [])
            res = await self.llm.synthesize(system_prompt=system_prompt, user_prompt=user_prompt, history=history)

            # Update history
            history.append({"role": "user", "content": user_prompt})
            history.append({"role": "assistant", "content": res.get("content", "")})

            # Trim history to max len
            if len(history) > _MAX_HISTORY_LEN:
                history = history[-_MAX_HISTORY_LEN:]

            _session_histories[session_id] = history

            return res
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

