from pydantic import BaseModel


class UserContext(BaseModel):
    user_id: str
    employee_id: str | None = None
    role: str
    department_ids: list[str] = []
    manager_scope: list[str] = []
    full_name: str = ""
    department_name: str = ""

    def normalized_role(self) -> str:
        return self.role.upper().replace("ROLE_", "").strip()

    def is_admin_or_hr(self) -> bool:
        return self.normalized_role() in ("ADMIN", "HR", "HRM", "HR_MANAGER", "HR_OFFICER")

    def is_manager(self) -> bool:
        return self.normalized_role() in ("MANAGER", "LEAD", "TRUONG_PHONG")

    def can_view_others(self) -> bool:
        return self.is_admin_or_hr() or self.is_manager()

