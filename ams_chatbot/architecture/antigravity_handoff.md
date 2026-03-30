# Antigravity Handoff

## Mục tiêu handoff
Bộ file này được chuẩn bị để Antigravity có thể code module chatbot theo hướng production-friendly.

## Cần đọc theo thứ tự
1. `rule_agent.md`
2. `agent.md`
3. `plan.md`
4. `tasks.md`
5. `architecture/chatbot_architecture.md`

## Kỳ vọng với Antigravity
- giữ nguyên folder `ams_chatbot` là module độc lập
- không trộn code vào `ams_be` trừ khi cần thêm API contract nhỏ
- ưu tiên code `chatbot_service` trước
- chỉ thêm Rasa actions mỏng, không nhét business logic lớn vào Rasa
- dùng Qdrant cho knowledge, không cho dynamic attendance data vào vector DB
- dùng `openrouter/free` làm default model config nhưng giữ abstraction để thay model sau

## Thứ tự code nên làm
1. bootstrap `chatbot_service`
2. auth + user context
3. attendance/schedule/request connectors
4. basic router
5. Rasa NLU assets
6. Qdrant retrieval
7. LLM synthesis
8. tests + docs

## Definition of quality
- clean architecture mức vừa đủ
- async I/O
- typed schemas
- traceable logs
- explicit timeout
- graceful fallback
