from __future__ import annotations

from typing import Any, Dict, List, Text

from rasa_sdk import Action, Tracker, FormValidationAction
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import AllSlotsReset


class ActionGreetUser(Action):
    def name(self) -> Text:
        return "action_greet_user"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(text="Chào bạn, mình sẵn sàng hỗ trợ về chấm công, ca làm việc, đơn từ và policy.")
        return []


class ActionGetTodayShift(Action):
    def name(self) -> Text:
        return "action_get_today_shift"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(text="Hôm nay bạn có ca Hành chính 08:00-17:30.")
        return []


class ActionGetMyAttendanceToday(Action):
    def name(self) -> Text:
        return "action_get_my_attendance_today"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(text="Hệ thống ghi nhận bạn check-in lúc 07:58 và đang ở trạng thái PRESENT.")
        return []


class ActionGetAttendanceHistory(Action):
    def name(self) -> Text:
        return "action_get_attendance_history"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(text="[stub] Lịch sử chấm công sẽ được lấy từ backend theo khoảng thời gian đã xác nhận.")
        return []


class ActionGetRequestStatus(Action):
    def name(self) -> Text:
        return "action_get_request_status"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        req_type = tracker.get_slot("request_type") or "leave"
        dispatcher.utter_message(text=f"Đơn {req_type} của bạn đang ở trạng thái SUBMITTED.")
        return []


class ActionSubmitLeaveRequest(Action):
    def name(self) -> Text:
        return "action_submit_leave_request"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(text="[stub] Đơn nghỉ phép sẽ được submit qua chatbot_service -> ams_be.")
        return []


class ActionSubmitOtRequest(Action):
    def name(self) -> Text:
        return "action_submit_ot_request"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(text="[stub] Đơn OT sẽ được submit qua chatbot_service -> ams_be.")
        return []


class ActionSubmitExplanationRequest(Action):
    def name(self) -> Text:
        return "action_submit_explanation_request"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(text="[stub] Đơn giải trình sẽ được submit qua chatbot_service -> ams_be.")
        return []


class ActionGetTeamAttendance(Action):
    def name(self) -> Text:
        return "action_get_team_attendance"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(text="[stub] Team attendance cần RBAC manager/HR trước khi gọi backend.")
        return []


class ActionGetReportSummary(Action):
    def name(self) -> Text:
        return "action_get_report_summary"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(text="[stub] Report summary sẽ đi qua chatbot_service để tổng hợp dữ liệu trước khi trả lời.")
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
