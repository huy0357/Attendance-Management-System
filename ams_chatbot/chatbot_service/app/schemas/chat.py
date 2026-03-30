from typing import Any

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: str
    locale: str = "vi"


class ChatResponse(BaseModel):
    success: bool
    message: str
    data: dict[str, Any] = {}
    trace_id: str
    latency_ms: int
    suggestions: list[str] = []
