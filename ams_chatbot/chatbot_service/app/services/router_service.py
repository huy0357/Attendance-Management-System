from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta

import httpx
from unidecode import unidecode

from app.core.settings import settings

logger = logging.getLogger(__name__)

# All supported intents for LLM classification
_ALL_INTENTS = [
    "direct_today_shift",
    "direct_attendance_today",
    "query_attendance_month",
    "query_attendance_year",
    "direct_request_status",
    "query_requests_list",
    "query_my_subordinates",
    "query_leave_balance",
    "direct_salary_report",
    "direct_attendance_report",
    "query_employee_info",
    "query_employee_list",
    "query_department_list",
    "export_attendance_csv",
    "export_employee_csv",
    "export_requests_csv",
    "knowledge_search",
    "general_chat",
]

_LLM_SYSTEM_PROMPT = """Bạn là bộ phân loại intent cho chatbot hệ thống chấm công AMS.
Cho một câu hỏi từ user, hãy phân loại vào MỘT trong các intent sau:

- direct_today_shift: hỏi ca làm việc hôm nay, mấy giờ đi làm
- direct_attendance_today: hỏi chấm công hôm nay, đã check-in/check-out chưa
- query_attendance_month: hỏi chấm công theo tháng, hoặc hỏi chấm công của một nhân viên cụ thể
- query_attendance_year: hỏi chấm công theo năm
- direct_request_status: hỏi trạng thái đơn từ (đơn nghỉ phép, đơn OT...)
- query_requests_list: hỏi danh sách các đơn từ
- query_my_subordinates: hỏi cấp dưới của mình là ai, mình quản lý những ai, có thể xem ai
- query_leave_balance: hỏi số ngày phép còn lại, số ngày nghỉ phép năm nay, còn bao nhiêu ngày phép
- direct_salary_report: hỏi bảng lương, phiếu lương CỦA MÌNH
- direct_attendance_report: hỏi báo cáo chấm công
- query_employee_info: hỏi thông tin một nhân viên cụ thể
- query_employee_list: hỏi danh sách tất cả nhân viên
- query_department_list: hỏi danh sách phòng ban
- export_attendance_csv: yêu cầu xuất file CSV chấm công
- export_employee_csv: yêu cầu xuất file CSV nhân viên
- export_requests_csv: yêu cầu xuất file CSV đơn từ
- knowledge_search: hỏi về quy định, chính sách, nội quy công ty
- general_chat: chào hỏi, hỏi về chatbot, câu hỏi chung

Đồng thời extract các thực thể:
- target_name: tên nhân viên được nhắc đến (nếu có). Trả về tên gốc tiếng Việt.
- month: tháng được nhắc đến (nếu có), format YYYY-MM. Năm hiện tại là """ + str(datetime.now().year) + """.

Trả về JSON duy nhất, KHÔNG giải thích:
{"intent": "...", "target_name": null, "month": null}"""


class RouterService:
    DIRECT_INTENTS = {
        "ask_today_shift": "direct_today_shift",
        "ask_my_attendance_today": "direct_attendance_today",
        "ask_request_status": "direct_request_status",
    }

    # Vietnamese month names → number
    _MONTH_NAMES = {
        "mot": 1, "hai": 2, "ba": 3, "tu": 4, "nam": 5, "sau": 6,
        "bay": 7, "tam": 8, "chin": 9, "muoi": 10,
        "muoi mot": 11, "muoi hai": 12,
        "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
        "7": 7, "8": 8, "9": 9, "10": 10, "11": 11, "12": 12,
    }

    def _detect_person_name(self, message: str) -> bool:
        """Quick check if the message mentions a person's name."""
        # 1. Check for capitalized proper names
        m = re.search(r'[A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){2,5}', message.strip())
        if m:
            skip = {"hom nay", "ca hanh chinh", "ngay phep", "bang luong",
                    "cham cong", "phong ban", "nhan vien"}
            if unidecode(m.group(0).lower()) not in skip:
                return True

        # 2. Check for lowercase names using common Vietnamese surnames (3+ words)
        text = unidecode(message.lower())
        surnames = r'\b(nguyen|tran|le|pham|hoang|huynh|phan|vu|vo|dang|bui|do|ho|ngo|duong|ly)\s+[a-z]+\s+[a-z]+\b'
        if re.search(surnames, text):
            return True

        return False

    def resolve(self, message: str) -> str:
        text = unidecode(message.lower())
        has_person_name = self._detect_person_name(message)

        # ── Export intents (check first, most specific) ──
        is_export_action = any(k in text for k in ["xuat", "export", "tai", "download", "lay file", "gui file", "tai ve"])
        has_export_target = any(k in text for k in ["cham cong", "bang cong", "nhan vien", "nhan su", "don", "request", "csv", "excel", "xlsx", "file", "bao cao"])

        if (is_export_action and has_export_target) or any(k in text for k in [
            "xuat csv", "export csv", "tai csv", "xuat file", "export file",
            "xuat excel", "tai excel", "download", "xuat bao cao", "tai file", "xuat cham cong", "tai cham cong",
            "xem bao cao cham cong", "bao cao cham cong",
        ]):
            if any(k in text for k in ["nhan vien", "employee", "danh sach nhan vien", "nhan su"]):
                return "export_employee_csv"
            if any(k in text for k in ["don tu", "don nghi", "request", "don"]):
                return "export_requests_csv"
            if any(k in text for k in ["cham cong", "attendance", "bang cong", "ngay cong", "cong"]):
                return "export_attendance_csv"
            return "export_attendance_csv"  # default export

        # ── Specific Date or Daily Attendance Question (Single day query) ──
        has_specific_date = self.extract_date(message) is not None
        is_time_question = any(k in text for k in ["may gio", "luc may gio", "gio vao", "gio ra", "khi nao", "luc nao", "co mat khong", "co di lam khong", "co check in khong", "co check out khong", "chua"])
        is_day_context = has_specific_date or any(k in text for k in ["hom nay", "hom qua", "hom kia"])

        if (has_specific_date or is_time_question or is_day_context) and any(k in text for k in ["cham cong", "check in", "checkin", "check out", "checkout", "di lam", "may gio", "co mat", "vao lam", "tan lam", "ngay"]):
            # If asking about shift/schedule:
            if any(k in text for k in ["ca lam", "lich lam", "lich ca", "ca gi", "lam ca"]):
                return "direct_today_shift"
            # If explicit request for entire monthly table, skip:
            if not (any(k in text for k in ["ca thang", "toan thang", "bang cong"]) and not has_specific_date and not is_time_question):
                return "direct_attendance_today"

        # ── If someone else's name detected + attendance context → route to monthly (has RBAC) ──
        if has_person_name and any(k in text for k in [
            "cham cong", "di lam", "check in", "checkin", "check-in",
            "bang cong", "ngay cong",
        ]):
            # If has shift/schedule keywords → shift handler
            if any(k in text for k in ["ca lam", "lich lam", "lich ca", "ca gi", "lam ca"]):
                return "direct_today_shift"
            return "query_attendance_month"

        # ── Attendance monthly (must check before daily) ──
        if any(k in text for k in ["cham cong", "bang cong", "attendance", "ngay cong"]) and (any(k in text for k in ["thang", "month", "ca thang", "toan thang", "bang cong"]) or "xem cham cong" in text):
            return "query_attendance_month"

        # ── Yearly attendance summary ──
        if any(k in text for k in ["tong ket cong", "tong ket nam", "tong ket ca nam", "tong hop cong", "cong ca nam", "cong nam"]):
            return "query_attendance_year"
        if any(k in text for k in ["cham cong", "bang cong", "ngay cong"]) and any(k in text for k in ["nam", "year", "ca nam", "nam nay"]):
            return "query_attendance_year"

        # ── Today shift / schedule ──
        if any(k in text for k in [
            "lich lam viec", "lam ca gi", "ca hom nay", "ca lam",
            "di lam luc nao", "may gio di lam", "may gio vao",
            "gio lam viec", "lich ca", "vao ca", "ca may",
            "hom nay lam gi", "hom nay di lam",
            "gio vao lam", "gio tan lam", "tan ca", "tan lam",
            "may gio bat dau", "may gio ket thuc",
        ]):
            return "direct_today_shift"
        # "ca" alone is too broad, check with context
        if "ca" in text.split() and any(k in text for k in ["hom nay", "nay", "mai", "lam"]):
            return "direct_today_shift"

        # ── Today attendance ──
        if any(k in text for k in [
            "check in", "checkin", "check-in",
            "check out", "checkout", "check-out",
            "da cham cong", "cham cong hom nay", "cham cong chua",
            "da check", "da vao chua", "da ra chua",
            "diem danh", "co mat", "cham cong", "ngay cong"
        ]):
            return "direct_attendance_today"

        # ── Requests list (check BEFORE status so "danh sách đơn của tôi" → list) ──
        if any(k in text for k in [
            "danh sach don", "cac don tu", "don tang ca",
            "xem don", "tat ca don", "nhung don",
            "cho xem don", "don tu cua toi", "danh sach don tu",
        ]):
            return "query_requests_list"

        # ── Request status (single latest) ──
        if any(k in text for k in [
            "trang thai don", "don da duyet chua", "don cua toi",
            "don nghi phep", "don xin nghi",
        ]):
            return "direct_request_status"
        if "don" in text and any(k in text for k in ["trang thai", "duyet", "tu choi", "cho duyet"]):
            return "direct_request_status"

        # ── My subordinates / who can I view ──
        if any(k in text for k in [
            "cap duoi cua toi", "nhan vien cua toi", "quan ly nhung ai",
            "toi quan ly ai", "xem duoc nhung ai", "xem duoc ai",
            "toi co the xem ai", "nhung nhan vien nao",
            "danh sach cap duoi", "nhan vien thuoc quyen",
        ]):
            return "query_my_subordinates"

        # ── Salary / Report ──
        if any(k in text for k in ["bang luong", "phieu luong", "luong thang", "xem luong"]):
            if "nguoi khac" in text or "ai" in text or "nhan vien" in text or ("cua" in text and not any(k in text for k in ["toi", "minh", "em", "anh", "chi", "to"])):
                pass
            else:
                return "direct_salary_report"
        if "bao cao cham cong" in text or "xuat cham cong" in text:
            return "direct_attendance_report"

        # ── Employee queries ──
        if any(k in text for k in [
            "thong tin nhan vien", "thong tin ca nhan", "ho so nhan vien",
            "profile", "thong tin cua toi", "ho so cua toi",
            "email cua", "so dien thoai cua",
        ]):
            return "query_employee_info"
        if any(k in text for k in [
            "danh sach nhan vien", "list nhan vien", "tat ca nhan vien",
            "bao nhieu nhan vien", "co nhung ai",
        ]):
            return "query_employee_list"

        # ── Department queries ──
        if any(k in text for k in [
            "danh sach phong ban", "phong ban nao", "cac phong ban",
            "phong ban", "bo phan",
        ]):
            return "query_department_list"

        # ── Leave Balance query ──
        has_leave_word = any(w in text for w in ["phep", "nghi phep", "phep nam", "ngay phep", "nghi phep nam"])
        has_balance_phrase = any(w in text for w in [
            "con bao nhieu", "bao nhieu", "may ngay", "con may", "so ngay",
            "con lai", "con khong", "het chua", "nam nay", "cua toi", "cua minh", "cua em",
            "kiem tra", "tra cuu", "xem ngay", "xem phep", "co bao nhieu", "con"
        ])
        is_policy_rule = any(w in text for w in [
            "quy dinh", "chinh sach", "huong dan", "noi quy", "luat", "thu tuc", "cach xin", "che do"
        ])

        if has_leave_word and has_balance_phrase and not is_policy_rule:
            return "query_leave_balance"

        if any(k in text for k in [
            "ngay phep con lai", "con bao nhieu phep", "so ngay phep",
            "bao nhieu ngay phep", "phep nam nay", "phep con lai",
            "ngay nghi phep con lai", "so ngay nghi phep", "phep cua toi",
            "con bao nhieu ngay phep", "ngay phep cua toi", "nghi phep con lai",
            "phep con", "ngay phep nam nay", "nghi phep nam nay",
            "con bao nhieu ngay nghi phep", "con bao nhieu ngay phep",
        ]):
            return "query_leave_balance"

        # ── Knowledge search (broad HR terms → search RAG) ──
        if any(k in text for k in [
            "quy dinh", "chinh sach", "huong dan", "noi quy",
            # Leave / absence
            "nghi phep", "nghi om", "nghi benh", "nghi viec", "nghi thai san",
            "nghi le", "nghi tet", "phep nam", "xin nghi",
            "het phep", "chuyen phep",
            # OT
            "tang ca", "lam them", "overtime", "he so ot", "gio ot",
            # Salary / insurance
            "luong", "bao hiem", "bhxh", "bhyt", "thuong", "phu cap",
            "thue", "thu nhap", "tien luong", "tra luong", "ky luong",
            "thuong tet", "thang 13", "thuong kpi",
            # Work rules
            "di muon", "ve som", "giai trinh", "vang mat",
            "dress code", "trang phuc", "noi quy",
            # WFH
            "wfh", "work from home", "lam viec tu xa", "lam o nha",
            # Onboarding
            "onboarding", "nhan vien moi", "thu viec",
            # Equipment / IT
            "laptop", "thiet bi", "it support", "mat khau", "quen mat khau",
            # Face recognition
            "nhan dien khuon mat", "face", "kiosk", "dang ky khuon mat",
            # Mobile app
            "app", "ung dung", "civams", "expo",
            # General HR
            "quyen han", "kpi", "dao tao", "bao mat",
            "ky luat", "sa thai", "canh cao",
            "hop dong", "ky hop dong",
        ]):
            return "knowledge_search"

        # ── General / identity ──
        if any(k in text for k in [
            "toi la ai", "vai tro", "ban la ai", "ban lam duoc gi",
            "help", "tro giup", "giup toi", "ban co the",
            "chao", "xin chao", "hello", "hi",
        ]):
            return "general_chat"

        return "fallback"

    # ─── LLM-based intent classification (fallback) ─────────────────

    async def classify_with_llm(self, message: str) -> dict:
        """Use LLM to classify intent and extract entities when keyword matching fails.
        
        Returns:
            {"intent": str, "target_name": str|None, "month": str|None}
        """
        if not settings.openrouter_api_key:
            logger.warning("LLM classify skipped: no API key")
            return {"intent": "knowledge_search", "target_name": None, "month": None}

        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.openrouter_model,
            "messages": [
                {"role": "system", "content": _LLM_SYSTEM_PROMPT + "\nCRITICAL: DO NOT OUTPUT 'Here's a thinking process' OR ANY REASONING. ONLY OUTPUT A RAW JSON OBJECT STARTING WITH '{'."},
                {"role": "user", "content": message},
            ],
            "temperature": 0,
            "max_tokens": 1024,
            "response_format": {"type": "json_object"},
        }

        try:
            async with httpx.AsyncClient(timeout=8) as client:
                response = await client.post(
                    f"{settings.openrouter_base_url.rstrip('/')}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                logger.warning(f"ROUTER_LLM Raw Response: {response.text.encode('utf-8', 'replace').decode('utf-8')}")
                data = response.json()

            content = data["choices"][0]["message"]["content"].strip()
            # Extract JSON from response (handle markdown code blocks)
            json_match = re.search(r'\{[^}]+\}', content)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = json.loads(content)

            intent = result.get("intent", "knowledge_search")
            if intent not in _ALL_INTENTS:
                intent = "knowledge_search"

            return {
                "intent": intent,
                "target_name": result.get("target_name"),
                "month": result.get("month"),
            }
        except json.JSONDecodeError as e:
            logger.error("LLM intent classification failed: %s | Raw response: %r", e, content)
            return {"intent": "general_chat", "target_name": None, "month": None}
        except Exception as exc:
            logger.warning("LLM intent classification failed: %s", exc)
            return {"intent": "general_chat", "target_name": None, "month": None}

    # ─── Utility methods ────────────────────────────────────────────

    def extract_month(self, message: str) -> str | None:
        """Extract month string (YYYY-MM) from a user message."""
        text = unidecode(message.lower())

        # Match patterns like "thang 7", "tháng 07", "thang 12/2026"
        m = re.search(r"thang\s*(\d{1,2})(?:\s*/\s*(\d{4}))?", text)
        if m:
            month_num = int(m.group(1))
            year = int(m.group(2)) if m.group(2) else datetime.now().year
            if 1 <= month_num <= 12:
                return f"{year:04d}-{month_num:02d}"

        # Match "07/2026" or "7/2026"
        m = re.search(r"(\d{1,2})\s*/\s*(\d{4})", text)
        if m:
            month_num = int(m.group(1))
            year = int(m.group(2))
            if 1 <= month_num <= 12:
                return f"{year:04d}-{month_num:02d}"

        return None

    def extract_year(self, message: str) -> int | None:
        """Extract a year (e.g. 2026) from a user message.
        Supports: 'năm 2026', 'nam 2026', '2026', 'năm nay' → current year.
        """
        text = unidecode(message.lower())

        # "nam nay" → current year
        if "nam nay" in text:
            return datetime.now().year

        # Match "nam 2026", "năm 2026", standalone "2026"
        m = re.search(r"(?:nam\s+)?(\d{4})", text)
        if m:
            year = int(m.group(1))
            if 2020 <= year <= 2099:
                return year

        return None

    def extract_target_name(self, message: str) -> str | None:
        """Extract the name of another person from the message, if asking about someone else.
        Returns None if asking about self, relative time, or no specific person.
        """
        original = message.strip()

        # Stopwords and question/time keywords that can NEVER be a target person name
        stop_words = {
            "toi", "minh", "em", "anh", "chi", "ban", "tao", "tui", "to", "cua", "cho",
            "hom", "nay", "hom nay", "hom qua", "hom kia", "ngay", "thang", "nam", "tuan",
            "may", "gio", "phut", "luc", "the nao", "sao", "chua", "roi", "dau", "nao",
            "gi", "ai", "bao nhieu", "co", "khong", "dc", "duoc", "ko", "nhi", "a", "ha",
            "nhe", "hien tai", "chua checkout", "check in", "check out", "checkin", "checkout",
            "tat ca", "toan bo", "toan cong ty", "toan the", "bao cao", "bang cong", "cham cong"
        }

        # Patterns: 
        # 1. After preposition: "của Ma Trọng Huy", "cho Nguyễn Văn A", "nhân viên Nguyễn Văn A"
        # 2. Before action verb: "ngày 2/8/2026 Ma Trọng Huy chấm công", "Ma Trọng Huy hôm nay đi làm", "Nguyễn Đức Huy làm ca gì"
        # 3. After intent keyword: "chấm công của Ma Trọng Huy"
        patterns = [
            r"(?:của|cho|nhân viên|nv)\s+([A-Za-zÀ-Ỹà-ỹ\s]{2,30})",
            r"(?:chấm công|thông tin|bảng công)\s+(?:của|cho|nhân viên\s+)?([A-Za-zÀ-Ỹà-ỹ\s]{2,30})",
            r"(?:^|ngày\s*[\d/-]+\s+|hôm nay\s+|hôm qua\s+|hôm kia\s+)([A-Za-zÀ-Ỹà-ỹ\s]{2,30}?)\s+(?:chấm công|check\s*in|checkin|check\s*out|checkout|đi làm|có đi làm|làm ca|vào ca|tan ca|làm việc|nghỉ)",
            # Pattern 4: Name before leave/phép context: "Ma Trọng Huy còn bao nhiêu ngày phép"
            r"^([A-ZÀ-Ỹ][A-Za-zÀ-Ỹà-ỹ\s]{2,30}?)\s+(?:còn|bao nhiêu|ngày phép|phép|số ngày|nghỉ phép)",
        ]

        for pattern in patterns:
            m = re.search(pattern, original, re.IGNORECASE)
            if m:
                raw_name = m.group(1).strip()
                # Clean prefix/noise keywords if captured
                words = raw_name.split()
                clean_words = []
                for w in words:
                    wn = unidecode(w.lower())
                    if wn in {"cua", "cho", "nhan", "vien", "nv", "cham", "cong", "bang", "thong", "tin", "xuat", "csv", "excel", "file", "thang", "nam", "xem", "tra", "cuu", "ngay", "hom", "nay", "qua", "kia"}:
                        continue
                    clean_words.append(w)
                if clean_words:
                    candidate = " ".join(clean_words)
                    candidate_clean = unidecode(candidate.lower())

                    # If candidate is a stop word, self pronoun, or question word, ignore
                    if candidate_clean in stop_words:
                        continue
                    if any(sw in candidate_clean.split() for sw in ["toi", "minh", "em", "tao", "tui", "may", "gio", "chua", "the", "nao", "sao", "hom", "nay"]):
                        continue

                    # Valid name if >= 2 words or single capitalized word
                    if len(clean_words) >= 2 or (len(clean_words) == 1 and clean_words[0][0].isupper() and len(clean_words[0]) >= 2):
                        return candidate
        return None

    def extract_date(self, message: str) -> str | None:
        """Extract a specific date string (YYYY-MM-DD) from a user message.
        Supports:
        - 'hôm qua', 'hom qua' -> yesterday
        - 'hôm kia', 'hom kia' -> day before yesterday
        - 'hôm nay', 'hom nay' -> today
        - '22/08/2026', '22/8/2026', '22-08-2026', '22-8-2026'
        - 'ngày 22/8', 'ngay 22/8' -> current year YYYY-08-22
        - 'ngày 22 tháng 8', 'ngay 22 thang 8' -> current year YYYY-08-22
        """
        text = unidecode(message.lower())
        now = datetime.now()

        # 1. Relative dates
        if any(w in text for w in ["hom qua", "ngay hom qua", "hom trc", "hom truoc"]):
            return (now - timedelta(days=1)).strftime("%Y-%m-%d")
        if any(w in text for w in ["hom kia", "ngay hom kia"]):
            return (now - timedelta(days=2)).strftime("%Y-%m-%d")
        if any(w in text for w in ["hom nay", "ngay hom nay"]):
            return now.strftime("%Y-%m-%d")

        # 2. Explicit full date DD/MM/YYYY or DD-MM-YYYY
        m = re.search(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b", text)
        if m:
            day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if 1 <= month <= 12 and 1 <= day <= 31:
                return f"{year:04d}-{month:02d}-{day:02d}"

        # 3. Date with Vietnamese words: "ngay 22 thang 8 nam 2026" or "ngay 22 thang 8"
        m = re.search(r"ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})(?:\s*nam\s*(\d{4}))?", text)
        if m:
            day = int(m.group(1))
            month = int(m.group(2))
            year = int(m.group(3)) if m.group(3) else now.year
            if 1 <= month <= 12 and 1 <= day <= 31:
                return f"{year:04d}-{month:02d}-{day:02d}"

        # 4. Short date DD/MM: "ngay 22/8" or "22/8"
        m = re.search(r"(?:ngay\s+)?\b(\d{1,2})[/-](\d{1,2})\b", text)
        if m:
            day = int(m.group(1))
            month = int(m.group(2))
            year = now.year
            if 1 <= month <= 12 and 1 <= day <= 31:
                return f"{year:04d}-{month:02d}-{day:02d}"

        return None


