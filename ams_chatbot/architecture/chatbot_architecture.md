# Chatbot Architecture

## 1. Deployment position
`ams_chatbot` là module độc lập, đặt cùng cấp với:
- `ams_be`
- `ams_fe`
- `faceRecognition_be`

## 2. Logical components
### 2.1 Frontend client
`ams_fe` gửi message, JWT, locale, session metadata.

### 2.2 Chatbot service
`chatbot_service` là orchestration gateway và là entrypoint chính.
Nó chịu trách nhiệm:
- xác thực context
- route intent
- gọi backend API
- query Qdrant
- gọi LLM nếu cần
- chuẩn hóa response cho frontend

### 2.3 Rasa
Rasa xử lý:
- intent classification
- entities
- forms
- conversation policies

### 2.4 Qdrant
Qdrant lưu knowledge chunks cho:
- policy
- FAQ
- how-to
- tài liệu hướng dẫn

### 2.5 LLM Provider
OpenRouter được dùng như unified API cho model miễn phí. Theo tài liệu chính thức, `openrouter/free` tự động chọn từ pool model miễn phí đang khả dụng và trả lại `model` thực tế đã dùng trong response. citeturn321160search0turn321160search2

### 2.6 AMS backend
`ams_be` là nguồn dữ liệu động và nghiệp vụ chuẩn.

## 3. Request flow
```text
ams_fe -> chatbot_service -> auth/rbac
                          -> rasa intent/entity
                          -> direct backend action
                          -> qdrant retrieval (nếu cần)
                          -> llm synthesis (nếu cần)
                          -> normalized response -> ams_fe
```

## 4. Routing policy
### 4.1 Direct action
Áp dụng cho câu hỏi dữ liệu động:
- hôm nay tôi check-in lúc mấy giờ
- hôm nay tôi có ca gì
- đơn nghỉ phép của tôi đang ở trạng thái nào

### 4.2 Retrieval
Áp dụng cho:
- quy định đi muộn
- cách tạo đơn OT
- chính sách nghỉ phép

### 4.3 LLM synthesis
Chỉ áp dụng khi:
- đã có facts từ API hoặc retrieval
- cần diễn đạt lại dễ hiểu
- hoặc cần tổng hợp nhiều dữ kiện nhỏ thành một câu trả lời ngắn

## 5. Security model
- JWT bắt buộc
- mọi API call giữ `trace_id`
- user scope được resolve 1 lần ở gateway
- backend vẫn là nơi xác nhận permission cuối cùng
- chatbot không bypass permission qua prompt

## 6. Response contract
```json
{
  "success": true,
  "message": "string",
  "data": {},
  "trace_id": "uuid",
  "latency_ms": 123,
  "suggestions": ["..."]
}
```

## 7. Performance policy
- direct action: mục tiêu < 800ms
- normal chat: mục tiêu < 2s
- rag + synthesis: mục tiêu < 3s

## 8. Suggested APIs from ams_be
- `GET /api/v1/me`
- `GET /api/v1/attendance/me/today`
- `GET /api/v1/attendance/me/history`
- `GET /api/v1/schedules/me/today`
- `GET /api/v1/requests/me`
- `POST /api/v1/requests/leave`
- `POST /api/v1/requests/ot`
- `POST /api/v1/requests/explanation`
- `GET /api/v1/reports/team-attendance`

## 9. Non-goals
- chatbot không tự tính payroll hoàn chỉnh
- chatbot không đọc raw biometric data
- chatbot không query DB production trực tiếp nếu đã có backend API
