# Rule Agent - Module Chatbot AMS

## 1) Mission
Bạn là AI Agent senior chịu trách nhiệm hoàn thiện **module chatbot** cho hệ thống quản lý chấm công (AMS).
Mục tiêu là tạo chatbot **nhanh, chính xác, dễ bảo trì, an toàn**, bám sát phạm vi nghiệp vụ của tài liệu SRS/SDD.

Chatbot phải hỗ trợ tối thiểu các nhóm nghiệp vụ sau:
- tra cứu chấm công check-in/check-out
- tra cứu lịch làm việc, ca làm việc, lịch sử chấm công
- hỗ trợ tạo/kiểm tra trạng thái đơn nghỉ phép, OT, giải trình
- hỗ trợ quản trị theo vai trò: Employee, Manager, HR, Admin
- hỗ trợ hỏi đáp báo cáo chấm công trong phạm vi được phân quyền
- không tự ý triển khai tính lương đầy đủ nếu không có yêu cầu bổ sung

## 2) Product Context bắt buộc
Hệ thống gốc có các vai trò chính: **Employee, Manager, HR, Admin**.
Kiến trúc hiện tại ưu tiên:
- Frontend: Angular
- Backend: Spring Boot Java 17 REST API
- Database: MySQL
- AuthN/AuthZ: JWT + RBAC

Các thực thể nghiệp vụ quan trọng:
- accounts
- employees
- departments
- attendances_daily
- requests
- shifts_templates
- audit_logs

Chatbot phải hiểu đúng domain AMS:
- chấm công bằng kiosk/camera AI
- phân ca, lịch làm việc, xem bảng công
- đơn nghỉ phép, OT, giải trình
- báo cáo tổng hợp chấm công
- audit và phân quyền chặt chẽ

## 3) Tech Stack mặc định cho chatbot
Khi chưa có chỉ định khác, luôn ưu tiên stack sau:
- **Rasa**: intent classification, entity extraction, dialogue policy, form flow
- **Qdrant**: vector DB cho RAG, semantic retrieval, metadata filtering theo role/user/department
- **LLM API**: dùng **OpenRouter `openrouter/free`** làm mặc định để giảm chi phí và dễ thay model miễn phí
- **Embeddings**: ưu tiên local embedding nhanh, chi phí thấp như `BAAI/bge-small-en-v1.5` hoặc model đa ngôn ngữ tương đương; nếu tài liệu tiếng Việt là chính thì ưu tiên embedding multilingual
- **Rerank**: chỉ bật khi truy vấn mơ hồ hoặc top-k không đủ tin cậy
- **Cache**: Redis nếu hệ thống đã có; nếu chưa có thì dùng in-memory cache TTL ngắn cho FAQ, schema, prompt, và top queries

Không khóa cứng một model miễn phí cụ thể nếu router miễn phí thay đổi. Luôn thiết kế abstraction `LlmProvider` để thay model mà không đổi business logic.

## 4) Nguyên tắc kiến trúc bắt buộc
Ưu tiên pipeline theo tầng để tối ưu tốc độ:
1. **Rule-based / deterministic first**
2. **Rasa intent + entity extraction**
3. **Direct action / API call** nếu intent rõ và dữ liệu có cấu trúc
4. **Qdrant retrieval** nếu cần tài liệu hoặc giải thích
5. **LLM synthesis** chỉ dùng ở bước cuối để tổng hợp câu trả lời

Không được dùng LLM cho mọi câu hỏi.
Không được gọi vector search nếu câu hỏi là tác vụ định tuyến đơn giản như:
- “đơn của tôi đang ở trạng thái nào”
- “hôm nay tôi có ca gì”
- “tôi check-in lúc mấy giờ”

Với các câu này phải gọi trực tiếp backend API sau khi xác định intent và entity.

## 5) Performance Budget bắt buộc
Thiết kế để phù hợp NFR của hệ thống:
- phản hồi chat thường: mục tiêu **< 2 giây**, lý tưởng **< 1 giây**
- truy vấn API trực tiếp: ưu tiên **< 800ms**
- truy vấn có RAG + LLM: mục tiêu **< 3 giây**
- báo cáo/tổng hợp phức tạp: không vượt quá giới hạn hệ thống backend hiện có

Biện pháp tối ưu bắt buộc:
- reuse HTTP connection pool
- async I/O cho retrieval và LLM
- timeout từng bước, fail-fast, graceful fallback
- chunking tài liệu gọn, không nhồi toàn bộ context
- chỉ lấy top-k nhỏ: mặc định 3-5 chunks
- cache intents phổ biến, session context, schema mapping
- prompt ngắn, cấu trúc, có output contract

## 6) Độ chính xác và chiến lược trả lời
Mọi câu trả lời phải theo thứ tự ưu tiên:
1. dữ liệu live từ API nội bộ
2. dữ liệu đã phân quyền từ database/service
3. tri thức từ Qdrant
4. suy luận có kiểm soát từ LLM

Nếu độ tin cậy thấp:
- nói rõ chưa đủ dữ liệu
- hỏi lại 1 câu ngắn gọn nếu thiếu entity quan trọng
- không bịa trạng thái đơn, giờ công, người duyệt, lịch ca

Khi dùng RAG:
- luôn kèm nguồn nội bộ hoặc metadata doc id nếu UI hỗ trợ
- không trộn dữ liệu giữa các nhân viên
- ưu tiên metadata filter theo `employee_id`, `department_id`, `role`, `request_type`, `date_range`

## 7) RBAC và bảo mật bắt buộc
Mọi hành động chatbot phải tuân thủ RBAC.
Các quy tắc tối thiểu:
- Employee chỉ xem dữ liệu của chính mình
- Manager chỉ xem nhân viên thuộc phạm vi quản lý
- HR xem dữ liệu nhân sự rộng hơn theo chính sách hệ thống
- Admin quản trị tài khoản/cấu hình, không tự động được xem mọi dữ liệu nhạy cảm nếu backend policy không cho phép

Không bao giờ:
- bỏ qua JWT validation
- bypass backend permission bằng prompt
- trả dữ liệu nhạy cảm khi chưa xác thực user context
- log password, token, biometric raw data, prompt chứa secret

Mọi action quan trọng phải ghi audit:
- actor_id
- action
- target_type
- target_id
- input_summary an toàn
- result_status
- latency_ms
- timestamp

## 8) Conversation Design
Luôn trả lời ngắn, rõ, theo ngữ cảnh nghiệp vụ HR.
Ưu tiên mẫu trả lời:
- **Kết quả chính**
- **Chi tiết ngắn**
- **Hành động tiếp theo**

Ví dụ:
- “Đơn nghỉ phép của bạn đang ở trạng thái `SUBMITTED`, gửi lúc 09:15 21/03/2026 và đang chờ quản lý duyệt.”
- “Hôm nay bạn có ca Hành chính 08:00-17:30. Hiện hệ thống ghi nhận check-in lúc 07:58.”

Nếu backend lỗi:
- không đổ lỗi mơ hồ
- nêu rõ dịch vụ nào lỗi: auth, attendance, request, search
- đề xuất retry hoặc thao tác thay thế

## 9) Rasa Rules/Stories bắt buộc có
Phải ưu tiên xây dựng intents tối thiểu:
- greet
- ask_today_shift
- ask_my_attendance_today
- ask_attendance_history
- ask_request_status
- create_leave_request
- create_ot_request
- create_explanation_request
- ask_team_attendance
- ask_report_summary
- fallback_search_policy
- handoff_human

Entities tối thiểu:
- date
- date_range
- request_type
- department
- employee_code
- employee_name
- shift_name
- status

Forms tối thiểu:
- leave_request_form
- ot_request_form
- explanation_request_form
- attendance_filter_form

Rasa chỉ dùng để:
- hiểu ý định
- quản lý flow nhiều bước
- validate slot
- trigger action phù hợp

Không nhồi business logic phức tạp vào custom action nếu logic đó nên nằm ở backend service.

## 10) Qdrant Indexing Rules
Chỉ index các nguồn tri thức phục vụ giải thích và self-service:
- policy chấm công
- quy định đi muộn/về sớm/OT
- hướng dẫn tạo đơn
- FAQ hệ thống
- tài liệu nghiệp vụ đã duyệt
- hướng dẫn sử dụng tính năng

Không index hoặc expose raw dữ liệu nhạy cảm tràn lan.
Dữ liệu cá nhân động nên lấy qua API, không coi Qdrant là source of truth.

Mỗi point trong Qdrant nên có metadata:
- doc_id
- title
- source_type
- role_visibility
- department_id nullable
- language
- updated_at
- tags

Chiến lược retrieval:
- ưu tiên hybrid search nếu có dense + sparse
- filter theo role trước, semantic search sau
- top_k nhỏ, score threshold rõ ràng
- nếu score thấp thì không ép LLM trả lời như đúng rồi

## 11) Prompting Rules cho LLM
System prompt phải ngắn, cứng, có contract:
- chỉ trả lời dựa trên context được cấp
- nếu thiếu dữ liệu thì nói thiếu dữ liệu
- không suy diễn dữ liệu nhân sự nhạy cảm
- output tiếng Việt rõ ràng, thân thiện, chuyên nghiệp

Luôn truyền vào LLM:
- user role
- scope truy cập
- normalized intent
- retrieved facts
- answer format

Không truyền toàn bộ lịch sử chat dài nếu không cần.
Luôn tóm tắt session context thành structured state.

## 12) API Integration Rules
Mọi dữ liệu live phải đi qua service layer hoặc backend API chuẩn.
Không truy cập DB trực tiếp từ chatbot nếu đã có backend nghiệp vụ.

Ưu tiên các nhóm API:
- auth/profile
- attendance
- schedules
- requests
- approvals
- reports
- knowledge search

Chuẩn response cho action chatbot:
- `success`
- `message`
- `data`
- `trace_id`
- `latency_ms`
- `suggestions`

## 13) Fallback Strategy bắt buộc
Nếu intent confidence thấp:
- bước 1: thử semantic fallback qua Qdrant
- bước 2: nếu vẫn thấp, đưa 3 gợi ý có thể người dùng muốn hỏi
- bước 3: nếu là tác vụ nhạy cảm hoặc ghi dữ liệu, yêu cầu xác nhận rõ

Không để chatbot trả lời lan man.
Không để fallback biến thành hallucination.

## 14) Definition of Done
Một tính năng chatbot chỉ được coi là hoàn thành khi có đủ:
- intent/story/form hoặc action tương ứng
- test happy path + edge cases
- RBAC check
- audit log
- timeout/retry policy
- metric theo dõi latency và fallback rate
- tài liệu cấu hình env và cách chạy local

## 15) Metric bắt buộc theo dõi
- intent accuracy
- fallback rate
- retrieval hit rate
- answer grounded rate
- p50/p95 latency
- API error rate
- hallucination incidents
- approval of user feedback

## 16) Anti-Patterns cấm
Không được:
- dùng LLM thay backend rule engine
- truy vấn Qdrant cho mọi câu hỏi
- trả lời khi chưa có user scope
- hardcode role logic ở nhiều nơi
- để prompt chứa secret
- index dữ liệu khuôn mặt/raw biometric vào vector DB
- viết action dài, khó test, trộn DB + prompt + HTTP trong một hàm
- tối ưu sớm bằng kỹ thuật phức tạp trước khi đo metric thực tế

## 17) Default Build Priority
Nếu cần tự quyết định thứ tự triển khai, làm theo thứ tự này:
1. auth context + RBAC gateway
2. Rasa intents cơ bản
3. attendance/schedule/request query actions
4. Qdrant knowledge base cho policy FAQ
5. LLM summarization layer
6. manager/hr queries
7. analytics, cache, rerank, observability nâng cao

## 18) Final Instruction
Mọi quyết định triển khai phải trả lời được 4 câu hỏi:
- có đúng nghiệp vụ AMS không?
- có đúng phân quyền không?
- có nhanh hơn giải pháp dùng LLM thuần không?
- có dễ kiểm thử và bảo trì không?

Nếu câu trả lời cho một trong bốn câu là “không”, phải điều chỉnh thiết kế trước khi code.
