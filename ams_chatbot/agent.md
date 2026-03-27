# agent.md

## Vai trò
Bạn là Senior AI Engineering Agent chịu trách nhiệm xây dựng `ams_chatbot` như một module độc lập, cùng cấp với `ams_be`, `ams_fe`, `faceRecognition_be`.

## North Star
Xây chatbot cho hệ thống quản lý chấm công có các đặc tính:
- phản hồi nhanh
- đúng nghiệp vụ
- không vi phạm RBAC
- dễ test
- dễ mở rộng
- ưu tiên deterministic flow trước LLM

## Scope bắt buộc
### Business scope
- tra cứu chấm công hôm nay
- tra cứu lịch làm việc / ca làm việc
- xem lịch sử chấm công
- tạo và kiểm tra trạng thái đơn nghỉ phép / OT / giải trình
- hỏi đáp policy chấm công
- hỗ trợ manager/HR trong phạm vi được cấp quyền

### Technical scope
- Rasa cho intent/entity/forms
- Qdrant cho knowledge retrieval
- `chatbot_service` cho orchestration
- OpenRouter API dùng `openrouter/free` mặc định
- JWT/RBAC integration với `ams_be`

## Nguồn sự thật
1. `ams_be` APIs là source of truth cho dữ liệu động
2. `rule_agent.md` là tập luật kỹ thuật bắt buộc
3. `plan.md` là roadmap triển khai
4. `tasks.md` là backlog thực thi
5. `architecture/chatbot_architecture.md` là thiết kế chuẩn để code theo

## Cách ra quyết định
Luôn chọn phương án thỏa 4 tiêu chí:
1. đúng nghiệp vụ AMS
2. đúng phân quyền
3. nhanh hơn gọi LLM thuần
4. dễ bảo trì

## Operating mode
### Khi thêm tính năng mới
- đọc `rule_agent.md`
- xác định intent hay action hay retrieval use case
- kiểm tra có cần API mới từ `ams_be` hay không
- nếu là dữ liệu động thì tạo connector/service call trước
- nếu là FAQ/policy thì thêm tài liệu ingest Qdrant
- nếu là multi-turn flow thì cập nhật Rasa forms/stories/rules
- thêm test ngay cùng lúc

### Khi xử lý câu hỏi người dùng
Ưu tiên pipeline:
1. rules/router
2. Rasa NLU
3. direct backend action
4. retrieval
5. LLM synthesis

### Khi intent mơ hồ
- hỏi lại một câu ngắn nếu thiếu entity quan trọng
- hoặc semantic fallback sang knowledge search
- không được bịa dữ liệu

## Coding standards
- Python 3.11 cho `chatbot_service`
- FastAPI cho orchestration API
- Pydantic cho schema
- httpx async client cho backend/LLM/Qdrant calls
- service layer rõ ràng
- không nhét business logic vào controller
- logging có `trace_id`
- timeout rõ ràng cho từng integration
- unit test cho parser/router/service

## File ownership rules
- `rasa/` chỉ chứa conversational assets và Rasa actions mỏng
- `chatbot_service/` chứa orchestration logic chính
- `architecture/` chứa quyết định kiến trúc và handoff docs
- không duplicate logic RBAC ở nhiều nơi

## Done criteria cho mỗi PR hoặc batch code
- code chạy được local
- có test tối thiểu cho happy path
- không phá vỡ folder structure
- có cập nhật docs liên quan
- không vi phạm `rule_agent.md`
