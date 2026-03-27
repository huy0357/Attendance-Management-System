# plan.md

## Mục tiêu triển khai
Xây một module `ams_chatbot` độc lập, tích hợp với hệ thống hiện có để xử lý các tác vụ chatbot nhanh và chính xác.

## Phase 0 - Workspace foundation
### Deliverables
- tạo folder `ams_chatbot` cùng cấp `ams_be`, `ams_fe`, `faceRecognition_be`
- bootstrap FastAPI service
- bootstrap Rasa project skeleton
- cấu hình `.env.example`
- docker compose local cho chatbot service + qdrant + rasa action server

### Exit criteria
- `chatbot_service` start được
- cấu trúc file ổn định

## Phase 1 - Auth + orchestration core
### Deliverables
- middleware nhận JWT từ frontend
- decode/validate token qua `ams_be` hoặc JWKS/internal auth contract
- `UserContext` gồm `user_id`, `employee_id`, `role`, `department_ids`, `manager_scope`
- request tracing + structured logging
- health endpoints

### Exit criteria
- chatbot service xác định đúng scope người dùng
- từ chối request không hợp lệ

## Phase 2 - Intent-first chatbot
### Deliverables
- Rasa intents cơ bản
- entity extraction cơ bản
- direct actions cho:
  - attendance today
  - today shift
  - request status
  - attendance history
- mapping response sang format chuẩn frontend

### Exit criteria
- user có thể hỏi 4 luồng chính mà chưa cần LLM

## Phase 3 - Qdrant knowledge layer
### Deliverables
- collection design
- ingestion pipeline cho policy, FAQ, hướng dẫn
- metadata filter theo role/language/source_type
- retrieval service trong `chatbot_service`
- score threshold + no-answer policy

### Exit criteria
- chatbot trả lời được FAQ/policy có grounding

## Phase 4 - LLM synthesis layer
### Deliverables
- OpenRouter connector dùng `openrouter/free`
- prompt contract ngắn gọn
- synthesis chỉ dùng khi có facts/retrieval rõ ràng
- fallback khi provider lỗi hoặc rate limit

### Exit criteria
- câu trả lời policy/phức hợp dễ đọc hơn nhưng không hallucinate

## Phase 5 - Multi-turn forms
### Deliverables
- leave request flow
- OT request flow
- explanation flow
- validation logic
- confirm-before-submit

### Exit criteria
- tạo đơn được theo form flow, không submit sai dữ liệu

## Phase 6 - Observability + hardening
### Deliverables
- metrics latency/fallback/error
- retry policy
- cache policy
- test coverage tăng dần
- audit logs cho action quan trọng

### Exit criteria
- có thể UAT nội bộ

## Phase 7 - Frontend integration
### Deliverables
- API contract cho `ams_fe`
- UI response cards/suggestions/source badges
- loading states/error states

### Exit criteria
- end-to-end flow hoạt động từ frontend tới chatbot và backend
