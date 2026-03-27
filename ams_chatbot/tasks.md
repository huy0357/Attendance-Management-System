# tasks.md

## Epic A - Foundation
- [ ] Tạo module `ams_chatbot` cùng cấp `ams_be`, `ams_fe`, `faceRecognition_be`
- [ ] Khởi tạo FastAPI service
- [ ] Khởi tạo Rasa project skeleton
- [ ] Tạo `docker-compose.yml`
- [ ] Tạo `.env.example`
- [ ] Viết README chạy local

## Epic B - Security and context
- [ ] Thiết kế `UserContext`
- [ ] Tạo middleware lấy JWT
- [ ] Tạo auth connector tới `ams_be`
- [ ] Chuẩn hóa RBAC guard
- [ ] Gắn `trace_id` cho mọi request
- [ ] Thêm audit logging cho action nhạy cảm

## Epic C - Intent and routing
- [ ] Tạo intents: greet, ask_today_shift, ask_my_attendance_today
- [ ] Tạo intents: ask_attendance_history, ask_request_status
- [ ] Tạo intents: create_leave_request, create_ot_request, create_explanation_request
- [ ] Tạo intents: ask_team_attendance, ask_report_summary, fallback_search_policy
- [ ] Tạo entity extraction cho date/date_range/request_type/status
- [ ] Xây router chọn direct_action / retrieval / llm_synthesis

## Epic D - Backend integrations
- [ ] Tạo attendance connector
- [ ] Tạo schedules connector
- [ ] Tạo requests connector
- [ ] Tạo approvals/report connector cho manager và HR
- [ ] Chuẩn hóa lỗi integration
- [ ] Timeout + retry giới hạn

## Epic E - Knowledge base
- [ ] Thiết kế Qdrant collection
- [ ] Tạo ingestion script cho policy docs
- [ ] Tạo chunking strategy
- [ ] Tạo embedding adapter
- [ ] Tạo retrieval + metadata filtering
- [ ] Viết score threshold policy

## Epic F - LLM layer
- [ ] Tạo OpenRouter connector
- [ ] Dùng model mặc định `openrouter/free`
- [ ] Thêm structured prompt template
- [ ] Chỉ cho phép synthesis khi có facts đủ mạnh
- [ ] Ghi model đã route thực tế vào log để debug

## Epic G - Multi-turn forms
- [ ] Leave request form
- [ ] OT request form
- [ ] Explanation request form
- [ ] Validate required slots
- [ ] Confirm trước khi submit
- [ ] Cancel flow an toàn

## Epic H - Testing
- [ ] Unit test router
- [ ] Unit test RBAC guards
- [ ] Unit test retrieval threshold
- [ ] Integration test attendance flow
- [ ] Integration test request flow
- [ ] E2E test chatbot API happy path

## Epic I - Frontend handoff
- [ ] Chuẩn response card cho `ams_fe`
- [ ] Quick replies cho câu hỏi phổ biến
- [ ] Source badges cho câu trả lời RAG
- [ ] Error messages rõ ràng
