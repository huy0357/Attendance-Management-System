# AMS Chatbot

Module chatbot độc lập cho hệ thống quản lý chấm công (AMS).

## Cấu trúc thư mục

```
ams_chatbot/
├── .env.example              # Template biến môi trường
├── docker-compose.yml        # Dựng local: qdrant + rasa + rasa-actions + chatbot-service
├── agent.md                  # Persona và operating mode của Antigravity
├── plan.md                   # Lộ trình triển khai theo phase
├── rule_agent.md             # Luật kỹ thuật cứng (read first)
├── tasks.md                  # Checklist công việc chi tiết
├── architecture/
│   ├── chatbot_architecture.md   # Thiết kế tổng thể hệ thống
│   └── antigravity_handoff.md    # Hướng dẫn handoff cho Antigravity
├── chatbot_service/          # FastAPI orchestration service
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── connectors/       # AMS backend + OpenRouter clients
│       ├── core/             # Settings + logging
│       ├── models/           # UserContext và domain models
│       ├── retrieval/        # Qdrant service
│       ├── routers/          # FastAPI routers (chat, health)
│       ├── schemas/          # Pydantic request/response schemas
│       └── services/         # ChatService + RouterService
├── rasa/                     # Rasa NLU + dialogue assets
│   ├── config.yml
│   ├── domain.yml
│   ├── actions/
│   │   └── actions.py
│   └── data/
│       ├── nlu.yml
│       ├── stories.yml
│       └── rules.yml
├── scripts/                  # Utility scripts (ingest, seed data)
└── tests/                    # Tests cho chatbot_service
```

## Chạy local nhanh

> **⚠️ LƯU Ý QUAN TRỌNG:** Dự án sử dụng đồng thời **Rasa 3.x** (cần Pydantic 1.x) và **FastAPI hiện đại** (cần Pydantic 2.x). Môi trường ảo (Conda/venv) của bạn tạo ra trên máy **CHỈ** nên dùng để phục vụ code và autocomplete cho VS Code. Tuyệt đối không chạy code trực tiếp bằng Conda để tránh xung đột sập hệ thống.

Để chạy hệ thống an toàn, bạn **BẮT BUỘC PHẢI DÙNG DOCKER** (các service đã được tách container hoàn toàn độc lập):

```bash
cp .env.example .env
# Điền OPENROUTER_API_KEY vào .env
docker compose up
```

## Tài liệu chi tiết

Xem hướng dẫn setup đầy đủ tại `architecture/chatbot_architecture.md`.
