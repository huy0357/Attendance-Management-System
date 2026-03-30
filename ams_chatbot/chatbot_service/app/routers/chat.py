from fastapi import APIRouter, Header

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService

router = APIRouter(tags=["chat"])
service = ChatService()


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, authorization: str | None = Header(default=None)) -> dict:
    return await service.handle_message(payload.message, token=authorization)
