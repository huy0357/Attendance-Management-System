from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

import httpx

from app.core.settings import settings


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
