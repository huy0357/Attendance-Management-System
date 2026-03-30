from __future__ import annotations


class RouterService:
    DIRECT_INTENTS = {
        "ask_today_shift": "direct_today_shift",
        "ask_my_attendance_today": "direct_attendance_today",
        "ask_request_status": "direct_request_status",
    }

    def resolve(self, message: str) -> str:
        text = message.lower()
        if "ca" in text or "lịch làm việc" in text:
            return "direct_today_shift"
        if "check in" in text or "chấm công" in text:
            return "direct_attendance_today"
        if "đơn" in text and "trạng thái" in text:
            return "direct_request_status"
        if "quy định" in text or "chính sách" in text or "hướng dẫn" in text:
            return "knowledge_search"
        return "fallback"
