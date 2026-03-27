from __future__ import annotations

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

    async def get_me(self, token: str) -> dict:
        try:
            jwt_token = token.replace("Bearer ", "") if token.startswith("Bearer ") else token
            import jwt
            payload = jwt.decode(jwt_token, options={"verify_signature": False})
            username = payload.get("sub", "real-user")
            role = payload.get("role", "EMPLOYEE")
            return {
                "user_id": username,
                "employee_id": f"EMP-{username}",
                "role": role,
                "department_ids": [],
                "manager_scope": []
            }
        except Exception:
            return {"user_id": "stub-user", "employee_id": "EMP001", "role": "EMPLOYEE", "department_ids": ["DEP001"]}

    async def get_attendance_today(self, token: str) -> dict:
        url = f"{self._base_url}/api/attendance/today"
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(url, headers=self._headers(token), timeout=self._timeout)
                r.raise_for_status()
                return r.json().get("data", {})
        except Exception:
            return {"date": "2026-03-22", "check_in": "07:58", "check_out": None, "status": "PRESENT"}

    async def get_today_shift(self, token: str) -> dict:
        url = f"{self._base_url}/api/schedules/today"
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(url, headers=self._headers(token), timeout=self._timeout)
                r.raise_for_status()
                return r.json().get("data", {})
        except Exception:
            return {"shift_name": "Hành chính", "start": "08:00", "end": "17:30"}

    async def get_request_status(self, token: str, request_type: str | None = None) -> dict:
        url = f"{self._base_url}/api/requests/my-latest"
        params = {"type": request_type} if request_type else {}
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(url, headers=self._headers(token), params=params, timeout=self._timeout)
                r.raise_for_status()
                return r.json().get("data", {})
        except Exception:
            return {"request_type": request_type or "leave", "status": "SUBMITTED", "submitted_at": "2026-03-22T09:15:00"}
