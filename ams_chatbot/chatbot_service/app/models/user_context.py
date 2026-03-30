from pydantic import BaseModel


class UserContext(BaseModel):
    user_id: str
    employee_id: str | None = None
    role: str
    department_ids: list[str] = []
    manager_scope: list[str] = []
