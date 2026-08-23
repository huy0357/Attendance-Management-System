from fastapi import APIRouter, Header, HTTPException, Request
import time

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService

router = APIRouter(tags=["chat"])
service = ChatService()

# Simple In-Memory Rate Limiting: 10 requests per minute per IP
_rate_limits: dict[str, list[float]] = {}
RATE_LIMIT = 10
RATE_WINDOW = 60.0

def _check_rate_limit(client_ip: str):
    now = time.time()
    history = _rate_limits.get(client_ip, [])
    # Keep only timestamps within the window
    history = [t for t in history if now - t < RATE_WINDOW]
    if len(history) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too Many Requests")
    history.append(now)
    _rate_limits[client_ip] = history

@router.post("/chat", response_model=ChatResponse)
async def chat(request: Request, payload: ChatRequest, authorization: str | None = Header(default=None)) -> dict:
    client_ip = request.client.host if request.client else "unknown"
    # _check_rate_limit(client_ip)
    return await service.handle_message(payload.message, token=authorization)
