from __future__ import annotations

import calendar
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx
from unidecode import unidecode

from app.core.settings import settings

logger = logging.getLogger(__name__)


class AmsBackendClient:
    def __init__(self) -> None:
        self._timeout = settings.ams_be_timeout_seconds
        self._base_url = settings.ams_be_base_url.rstrip("/")

    def _headers(self, token: str) -> dict:
        if token.startswith("Bearer "):
            return {"Authorization": token}
        return {"Authorization": f"Bearer {token}"}

    def _extract_data(self, payload: dict) -> dict:
        if isinstance(payload, dict) and isinstance(payload.get("data"), dict):
            return payload["data"]
        if isinstance(payload, dict):
            return payload
        return {}

    def _to_request_type_param(self, request_type: str | None) -> str | None:
        if not request_type:
            return None
        mapping = {
            "leave": "LEAVE",
            "ot": "OVERTIME",
            "overtime": "OVERTIME",
            "explanation": "EXPLANATION",
        }
        return mapping.get(request_type.strip().lower(), request_type.strip().upper())

    def _today_local_iso(self) -> str:
        return datetime.now(ZoneInfo(settings.app_timezone)).date().isoformat()

    def _month_date_range(self, month: str | None = None) -> tuple[str, str]:
        """Return (from_date, to_date) for a given month string (YYYY-MM) or current month."""
        if month and len(month) >= 7:
            try:
                year = int(month[:4])
                mon = int(month[5:7])
            except ValueError:
                year = datetime.now(ZoneInfo(settings.app_timezone)).year
                mon = datetime.now(ZoneInfo(settings.app_timezone)).month
        else:
            now = datetime.now(ZoneInfo(settings.app_timezone))
            year, mon = now.year, now.month
        last_day = calendar.monthrange(year, mon)[1]
        return f"{year:04d}-{mon:02d}-01", f"{year:04d}-{mon:02d}-{last_day:02d}"

    # ──────────────────────────────────────────────
    # Existing methods
    # ──────────────────────────────────────────────

    async def get_me(self, token: str) -> dict:
        if not token or token == "anonymous":
            raise RuntimeError("Missing Authorization token")

        url = f"{self._base_url}/api/v1/profile/me"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self._headers(token), timeout=self._timeout)
            response.raise_for_status()
            profile = self._extract_data(response.json())

        if not profile:
            raise RuntimeError("Profile endpoint returned empty user context")

        username = profile.get("username")
        employee_id = profile.get("employeeId")
        role_code = profile.get("roleCode")

        if not username or employee_id is None or not role_code:
            raise RuntimeError("Profile endpoint missing required fields: username/employeeId/roleCode")

        department_ids: list[str] = []
        if profile.get("departmentId") is not None:
            department_ids.append(str(profile.get("departmentId")))

        manager_scope: list[str] = []
        if profile.get("managerId") is not None:
            manager_scope.append(str(profile.get("managerId")))

        return {
            "user_id": str(username),
            "employee_id": str(employee_id),
            "role": str(role_code),
            "department_ids": department_ids,
            "manager_scope": manager_scope,
            "full_name": profile.get("fullName", ""),
            "department_name": profile.get("departmentName", ""),
        }

    async def get_attendance_today(self, token: str) -> dict:
        today = self._today_local_iso()
        url = f"{self._base_url}/api/attendance-daily/me"
        params = {"from": today, "to": today, "page": 0, "size": 1}
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self._headers(token), params=params, timeout=self._timeout)
            response.raise_for_status()
            payload = response.json()

        if not isinstance(payload, dict):
            return {}

        rows = payload.get("content") or []
        if not rows:
            return {"date": today, "check_in": None, "check_out": None, "status": "NO_RECORD"}

        row = rows[0]
        return {
            "date": str(row.get("workDate") or today),
            "check_in": row.get("firstInTime"),
            "check_out": row.get("lastOutTime"),
            "status": row.get("status") or "N/A",
        }

    async def get_today_shift(self, token: str, employee_id: str | None = None) -> dict:
        if not employee_id:
            raise RuntimeError("Missing employee_id for schedule lookup")

        today = self._today_local_iso()
        url = f"{self._base_url}/api/v1/schedules/by-employee/day"
        params = {"employeeId": employee_id, "date": today}
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self._headers(token), params=params, timeout=self._timeout)
            response.raise_for_status()
            payload = response.json()

        if isinstance(payload, list) and payload:
            shift = payload[0]
            return {
                "shift_name": shift.get("shiftName") or "N/A",
                "start": shift.get("startTime") or "?",
                "end": shift.get("endTime") or "?",
            }
        return {}

    async def get_request_status(self, token: str, employee_id: str | None = None, request_type: str | None = None) -> dict:
        if not employee_id:
            raise RuntimeError("Missing employee_id for request status lookup")

        url = f"{self._base_url}/api/requests"
        params = {"employeeId": employee_id, "page": 1, "size": 1}
        type_param = self._to_request_type_param(request_type)
        if type_param:
            params["type"] = type_param
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self._headers(token), params=params, timeout=self._timeout)
            response.raise_for_status()
            payload = self._extract_data(response.json())

        items = payload.get("items") if isinstance(payload, dict) else None
        if not isinstance(items, list) or not items:
            return {"request_type": request_type or "request", "status": "NO_REQUEST"}

        latest = items[0]
        return {
            "request_type": latest.get("requestType") or request_type or "request",
            "status": latest.get("status") or "N/A",
            "submitted_at": latest.get("submittedAt"),
        }

    def get_salary_report_url(self, token: str) -> str:
        today = self._today_local_iso()
        month_key = today[:7]  # YYYY-MM
        public_url = self._base_url.replace("host.docker.internal", "localhost")
        return f"{public_url}/api/exports/salary?month={month_key}"

    def get_attendance_report_url(self, token: str, employee_id: str, month: str | None = None) -> str:
        month_key = month if month and len(month) >= 7 else self._today_local_iso()[:7]
        public_url = self._base_url.replace("host.docker.internal", "localhost")
        return f"{public_url}/api/exports/attendance-employee-daily?month={month_key}&employeeId={employee_id}"

    # ──────────────────────────────────────────────
    # NEW: Attendance monthly queries
    # ──────────────────────────────────────────────

    async def get_attendance_monthly(self, token: str, employee_id: str, month: str | None = None) -> list[dict]:
        """Get attendance records for a specific employee for a given month."""
        from_date, to_date = self._month_date_range(month)
        url = f"{self._base_url}/api/attendance-daily/employee/{employee_id}"
        params = {"from": from_date, "to": to_date, "page": 0, "size": 50}
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self._headers(token), params=params, timeout=self._timeout)
            response.raise_for_status()
            payload = response.json()

        rows = payload.get("content") or [] if isinstance(payload, dict) else []
        return [
            {
                "date": str(r.get("workDate", "")),
                "check_in": r.get("firstInTime"),
                "check_out": r.get("lastOutTime"),
                "status": r.get("status", "N/A"),
                "employee_name": r.get("employeeName", ""),
            }
            for r in rows
        ]

    async def get_attendance_yearly(self, token: str, employee_id: str, year: int | None = None) -> list[dict]:
        """Get attendance records for a specific employee for an entire year.
        If the year is the current year, fetches from Jan 1 up to today.
        """
        now = datetime.now()
        target_year = year or now.year
        from_date = f"{target_year}-01-01"
        # If current year, only fetch up to today; otherwise full year
        if target_year == now.year:
            to_date = now.strftime("%Y-%m-%d")
        else:
            to_date = f"{target_year}-12-31"

        url = f"{self._base_url}/api/attendance-daily/employee/{employee_id}"
        all_rows: list[dict] = []
        page = 0
        while True:
            params = {"from": from_date, "to": to_date, "page": page, "size": 50}
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=self._headers(token), params=params, timeout=self._timeout)
                response.raise_for_status()
                payload = response.json()
            rows = payload.get("content") or [] if isinstance(payload, dict) else []
            for r in rows:
                all_rows.append({
                    "date": str(r.get("workDate", "")),
                    "check_in": r.get("firstInTime"),
                    "check_out": r.get("lastOutTime"),
                    "status": r.get("status", "N/A"),
                    "employee_name": r.get("employeeName", ""),
                })
            total_pages = payload.get("totalPages", 1) if isinstance(payload, dict) else 1
            page += 1
            if page >= total_pages or page >= 50:  # Safety cap
                break
        return all_rows

    async def get_attendance_monthly_admin(self, token: str, month: str | None = None) -> list[dict]:
        """Get attendance records for ALL employees for a given month (ADMIN/HR only)."""
        from_date, to_date = self._month_date_range(month)
        url = f"{self._base_url}/api/attendance-daily/admin"
        all_rows: list[dict] = []
        page = 0
        while True:
            params = {"from": from_date, "to": to_date, "page": page, "size": 50}
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=self._headers(token), params=params, timeout=self._timeout)
                response.raise_for_status()
                payload = response.json()
            rows = payload.get("content") or [] if isinstance(payload, dict) else []
            for r in rows:
                all_rows.append({
                    "date": str(r.get("workDate", "")),
                    "check_in": r.get("firstInTime"),
                    "check_out": r.get("lastOutTime"),
                    "status": r.get("status", "N/A"),
                    "employee_name": r.get("employeeName", ""),
                    "employee_id": r.get("employeeId"),
                })
            total_pages = payload.get("totalPages", 1) if isinstance(payload, dict) else 1
            page += 1
            if page >= total_pages or page >= 20:  # Safety cap
                break
        return all_rows

    # ──────────────────────────────────────────────
    # NEW: Employee queries
    # ──────────────────────────────────────────────

    async def get_employee_info(self, token: str, employee_id: str) -> dict:
        """Get detailed info for a single employee."""
        url = f"{self._base_url}/api/employees/{employee_id}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self._headers(token), timeout=self._timeout)
            response.raise_for_status()
            return response.json()

    async def get_all_employees(self, token: str) -> list[dict]:
        """Get all employees (ADMIN only)."""
        url = f"{self._base_url}/api/employees"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self._headers(token), timeout=self._timeout)
            response.raise_for_status()
            data = response.json()
        return data if isinstance(data, list) else []

    async def search_employee_by_name(self, token: str, name: str) -> list[dict]:
        """Search employees by name using exact and fuzzy token matching."""
        all_emps = await self.get_all_employees(token)
        if not all_emps:
            return []

        clean_target = unidecode(name.strip().lower())
        # Remove common noise words
        for noise in ["cua", "cho", "nhan vien", "nv", "chua"]:
            if clean_target.startswith(noise + " "):
                clean_target = clean_target[len(noise) + 1:].strip()

        target_tokens = [t for t in clean_target.split() if t]
        if not target_tokens:
            return all_emps

        exact_matches = []
        subset_matches = []
        token_matches = []

        for emp in all_emps:
            full_name = unidecode((emp.get("fullName") or emp.get("full_name") or "").strip().lower())
            emp_code = unidecode((emp.get("employeeCode") or emp.get("employee_code") or "").strip().lower())
            emp_words = full_name.split()

            if clean_target == full_name or clean_target == emp_code:
                exact_matches.append(emp)
            elif clean_target in full_name or clean_target in emp_code:
                exact_matches.append(emp)
            elif all(tok in emp_words for tok in target_tokens):
                subset_matches.append(emp)
            elif any(tok in emp_words for tok in target_tokens if len(tok) > 2):
                token_matches.append(emp)

        return exact_matches or subset_matches or token_matches

    async def get_department_employees(self, token: str, department_id: str) -> list[dict]:
        """Get employees in a specific department (for manager subordinate queries)."""
        url = f"{self._base_url}/api/employees"
        params = {"departmentId": department_id, "page": 0, "size": 100}
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self._headers(token), params=params, timeout=self._timeout)
            response.raise_for_status()
            payload = response.json()
        if isinstance(payload, dict):
            return payload.get("content") or payload.get("items") or []
        return payload if isinstance(payload, list) else []

    # ──────────────────────────────────────────────
    # NEW: Requests queries
    # ──────────────────────────────────────────────

    async def get_my_requests(self, token: str, employee_id: str, page: int = 1, size: int = 20) -> dict:
        """Get paginated requests for a specific employee."""
        url = f"{self._base_url}/api/requests"
        params = {"employeeId": employee_id, "page": page, "size": size}
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self._headers(token), params=params, timeout=self._timeout)
            response.raise_for_status()
            return self._extract_data(response.json())

    async def get_all_requests(self, token: str, page: int = 1, size: int = 20) -> dict:
        """Get all requests globally (ADMIN/HR only)."""
        url = f"{self._base_url}/api/requests/all"
        params = {"page": page, "size": size}
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self._headers(token), params=params, timeout=self._timeout)
            response.raise_for_status()
            return self._extract_data(response.json())

    # ──────────────────────────────────────────────
    # NEW: Department queries
    # ──────────────────────────────────────────────

    async def get_departments(self, token: str) -> list[dict]:
        """Get list of departments."""
        url = f"{self._base_url}/api/departments"
        params = {"page": 0, "size": 100}
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self._headers(token), params=params, timeout=self._timeout)
            response.raise_for_status()
            payload = response.json()
        if isinstance(payload, dict):
            return payload.get("content") or []
        return payload if isinstance(payload, list) else []

    # ──────────────────────────────────────────────
    # NEW: Export URLs (existing Java endpoints)
    # ──────────────────────────────────────────────

    def get_attendance_monthly_export_url(self, month: str | None = None) -> str:
        """URL to download .xlsx attendance monthly report from Java Backend."""
        if not month:
            month = self._today_local_iso()[:7]
        public_url = self._base_url.replace("host.docker.internal", "localhost")
        return f"{public_url}/api/exports/attendance-monthly?month={month}"

    def get_employees_export_url(self) -> str:
        """URL to download .xlsx employee list from Java Backend."""
        public_url = self._base_url.replace("host.docker.internal", "localhost")
        return f"{public_url}/api/exports/employees"
