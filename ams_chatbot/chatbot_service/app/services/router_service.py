from __future__ import annotations

from unidecode import unidecode


class RouterService:
    DIRECT_INTENTS = {
        "ask_today_shift": "direct_today_shift",
        "ask_my_attendance_today": "direct_attendance_today",
        "ask_request_status": "direct_request_status",
    }

    def resolve(self, message: str) -> str:
        text = unidecode(message.lower())
        if "ca" in text or "lich lam viec" in text:
            return "direct_today_shift"
        if "check in" in text or "cham cong" in text:
            return "direct_attendance_today"
        if "don" in text and "trang thai" in text:
            return "direct_request_status"
        if "quy dinh" in text or "chinh sach" in text or "huong dan" in text:
            return "knowledge_search"
        if (
            "toi la ai" in text
            or "vai tro" in text
            or "ban la ai" in text
            or "ban lam duoc gi" in text
            or "help" in text
        ):
            return "general_chat"
        return "fallback"
