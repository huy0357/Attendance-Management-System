from __future__ import annotations

import os
from typing import Any, Dict, List, Text

import httpx
from rasa_sdk import Action, FormValidationAction, Tracker
from rasa_sdk.events import AllSlotsReset
from rasa_sdk.executor import CollectingDispatcher

AMS_BE_BASE_URL = os.getenv("AMS_BE_BASE_URL", "http://localhost:8080").rstrip("/")
AMS_BE_TIMEOUT_SECONDS = float(os.getenv("AMS_BE_TIMEOUT_SECONDS", "8"))


def _extract_token(tracker: Tracker) -> str | None:
    metadata = tracker.latest_message.get("metadata") or {}
    token = metadata.get("token")
    if not token:
        return None
    token = str(token)
    if token.startswith("Bearer "):
        return token
    return f"Bearer {token}"


async def _call_ams(
    method: str,
    path: str,
    token: str,
    params: dict[str, Any] | None = None,
    body: dict[str, Any] | None = None,
) -> dict:
    url = f"{AMS_BE_BASE_URL}{path}"
    async with httpx.AsyncClient(timeout=AMS_BE_TIMEOUT_SECONDS) as client:
        response = await client.request(
            method=method,
            url=url,
            headers={"Authorization": token},
            params=params,
            json=body,
        )
        response.raise_for_status()
        payload = response.json()
        if isinstance(payload, dict) and isinstance(payload.get("data"), dict):
            return payload["data"]
        if isinstance(payload, dict):
            return payload
        return {}


class ActionGreetUser(Action):
    def name(self) -> Text:
        return "action_greet_user"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(text="Chao ban, minh san sang ho tro ve cham cong, ca lam viec, don tu va policy.")
        return []


class ActionGetTodayShift(Action):
    def name(self) -> Text:
        return "action_get_today_shift"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        token = _extract_token(tracker)
        if not token:
            dispatcher.utter_message(text="Thieu thong tin dang nhap, chua the lay ca lam viec hom nay.")
            return []

        try:
            shift = await _call_ams("GET", "/api/schedules/today", token)
            shift_name = shift.get("shift_name", "N/A")
            shift_start = shift.get("start", "?")
            shift_end = shift.get("end", "?")
            dispatcher.utter_message(text=f"Hom nay ban co ca {shift_name} tu {shift_start} den {shift_end}.")
        except Exception as exc:
            dispatcher.utter_message(text=f"Khong the lay ca lam viec hom nay: {exc}")
        return []


class ActionGetMyAttendanceToday(Action):
    def name(self) -> Text:
        return "action_get_my_attendance_today"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        token = _extract_token(tracker)
        if not token:
            dispatcher.utter_message(text="Thieu thong tin dang nhap, chua the lay cham cong hom nay.")
            return []

        try:
            attendance = await _call_ams("GET", "/api/attendance/today", token)
            check_in = attendance.get("check_in", "chua co")
            check_out = attendance.get("check_out") or "chua checkout"
            status = attendance.get("status", "N/A")
            dispatcher.utter_message(
                text=f"Hom nay ban da check-in luc {check_in}, check-out: {check_out}. Trang thai: {status}."
            )
        except Exception as exc:
            dispatcher.utter_message(text=f"Khong the lay du lieu cham cong hom nay: {exc}")
        return []


class ActionGetAttendanceHistory(Action):
    def name(self) -> Text:
        return "action_get_attendance_history"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        token = _extract_token(tracker)
        if not token:
            dispatcher.utter_message(text="Thieu thong tin dang nhap, chua the lay lich su cham cong.")
            return []

        date_range = tracker.get_slot("date_range")
        params = {"date_range": date_range} if date_range else None

        try:
            history = await _call_ams("GET", "/api/attendance/history", token, params=params)
            dispatcher.utter_message(text=f"Lich su cham cong: {history}")
        except Exception as exc:
            dispatcher.utter_message(text=f"Khong the lay lich su cham cong: {exc}")
        return []


class ActionGetRequestStatus(Action):
    def name(self) -> Text:
        return "action_get_request_status"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        token = _extract_token(tracker)
        if not token:
            dispatcher.utter_message(text="Thieu thong tin dang nhap, chua the lay trang thai don.")
            return []

        req_type = tracker.get_slot("request_type")
        params = {"type": req_type} if req_type else None

        try:
            req = await _call_ams("GET", "/api/requests/my-latest", token, params=params)
            request_type = req.get("request_type", req_type or "don")
            status = req.get("status", "N/A")
            dispatcher.utter_message(text=f"Don {request_type} gan nhat cua ban dang o trang thai {status}.")
        except Exception as exc:
            dispatcher.utter_message(text=f"Khong the lay trang thai don: {exc}")
        return []


class ActionSubmitLeaveRequest(Action):
    def name(self) -> Text:
        return "action_submit_leave_request"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        token = _extract_token(tracker)
        if not token:
            dispatcher.utter_message(text="Thieu thong tin dang nhap, chua the gui don nghi phep.")
            return []

        body = {
            "date": tracker.get_slot("date"),
            "duration": tracker.get_slot("duration"),
            "reason": tracker.get_slot("reason"),
        }
        try:
            result = await _call_ams("POST", "/api/requests/leave", token, body=body)
            dispatcher.utter_message(text=f"Da gui don nghi phep thanh cong: {result}")
        except Exception as exc:
            dispatcher.utter_message(text=f"Khong the gui don nghi phep: {exc}")
        return []


class ActionSubmitOtRequest(Action):
    def name(self) -> Text:
        return "action_submit_ot_request"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        token = _extract_token(tracker)
        if not token:
            dispatcher.utter_message(text="Thieu thong tin dang nhap, chua the gui don OT.")
            return []

        body = {
            "date": tracker.get_slot("date"),
            "duration": tracker.get_slot("duration"),
            "reason": tracker.get_slot("reason"),
        }
        try:
            result = await _call_ams("POST", "/api/requests/ot", token, body=body)
            dispatcher.utter_message(text=f"Da gui don OT thanh cong: {result}")
        except Exception as exc:
            dispatcher.utter_message(text=f"Khong the gui don OT: {exc}")
        return []


class ActionSubmitExplanationRequest(Action):
    def name(self) -> Text:
        return "action_submit_explanation_request"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        token = _extract_token(tracker)
        if not token:
            dispatcher.utter_message(text="Thieu thong tin dang nhap, chua the gui don giai trinh.")
            return []

        body = {
            "date": tracker.get_slot("date"),
            "reason": tracker.get_slot("reason"),
        }
        try:
            result = await _call_ams("POST", "/api/requests/explanation", token, body=body)
            dispatcher.utter_message(text=f"Da gui don giai trinh thanh cong: {result}")
        except Exception as exc:
            dispatcher.utter_message(text=f"Khong the gui don giai trinh: {exc}")
        return []


class ActionGetTeamAttendance(Action):
    def name(self) -> Text:
        return "action_get_team_attendance"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        token = _extract_token(tracker)
        if not token:
            dispatcher.utter_message(text="Thieu thong tin dang nhap, chua the lay cham cong team.")
            return []

        department = tracker.get_slot("department")
        params = {"department": department} if department else None

        try:
            result = await _call_ams("GET", "/api/reports/team-attendance", token, params=params)
            dispatcher.utter_message(text=f"Tinh hinh cham cong team: {result}")
        except Exception as exc:
            dispatcher.utter_message(text=f"Khong the lay cham cong team: {exc}")
        return []


class ActionGetReportSummary(Action):
    def name(self) -> Text:
        return "action_get_report_summary"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        token = _extract_token(tracker)
        if not token:
            dispatcher.utter_message(text="Thieu thong tin dang nhap, chua the lay bao cao tong hop.")
            return []

        date_range = tracker.get_slot("date_range")
        params = {"date_range": date_range} if date_range else None

        try:
            result = await _call_ams("GET", "/api/reports/summary", token, params=params)
            dispatcher.utter_message(text=f"Bao cao tong hop cham cong: {result}")
        except Exception as exc:
            dispatcher.utter_message(text=f"Khong the lay bao cao tong hop: {exc}")
        return []


class ActionSearchPolicyFallback(Action):
    def name(self) -> Text:
        return "action_search_policy_fallback"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(text="[knowledge_search]")
        return []


class ActionDefaultFallback(Action):
    def name(self) -> Text:
        return "action_default_fallback"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(text="[knowledge_search]")
        return []


class ActionCancelFlow(Action):
    def name(self) -> Text:
        return "action_cancel_flow"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        return [AllSlotsReset()]


class BaseValidation:
    def _normalize(self, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip()
        return value


class ValidateLeaveRequestForm(BaseValidation, FormValidationAction):
    def name(self) -> Text:
        return "validate_leave_request_form"


class ValidateOtRequestForm(BaseValidation, FormValidationAction):
    def name(self) -> Text:
        return "validate_ot_request_form"


class ValidateExplanationRequestForm(BaseValidation, FormValidationAction):
    def name(self) -> Text:
        return "validate_explanation_request_form"


class ValidateAttendanceFilterForm(BaseValidation, FormValidationAction):
    def name(self) -> Text:
        return "validate_attendance_filter_form"
