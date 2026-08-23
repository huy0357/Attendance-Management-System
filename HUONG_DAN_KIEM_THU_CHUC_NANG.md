# HƯỚNG DẪN KIỂM THỬ CHỨC NĂNG (FUNCTIONAL TESTING)
## Khái niệm Đầu vào chuẩn (Valid Input) & Đầu vào lỗi (Invalid Input)

---

## 1. Cơ sở lý thuyết cho báo cáo

### 1.1. Đầu vào chuẩn (Valid / Normal Input – Positive Testing)
* **Định nghĩa:** Là tập hợp dữ liệu đầu vào đáp ứng đầy đủ và chính xác tất cả các quy tắc nghiệp vụ (Business Rules), ràng buộc dữ liệu (Data Constraints: kiểu dữ liệu, định dạng, độ dài, trường bắt buộc, tính toàn vẹn tham chiếu).
* **Mục đích:**
  * Kiểm chứng luồng xử lý chính của chức năng (*Happy Path*).
  * Đảm bảo hệ thống xử lý chính xác, lưu trữ dữ liệu toàn vẹn vào Cơ sở dữ liệu và trả về kết quả thành công đúng như đặc tả yêu cầu (Mã phản hồi HTTP `200 OK` / `201 Created`).

### 1.2. Đầu vào lỗi (Invalid / Abnormal Input – Negative Testing)
* **Định nghĩa:** Là tập hợp dữ liệu đầu vào cố tình vi phạm một hoặc nhiều quy tắc/ràng buộc của hệ thống (ví dụ: bỏ trống trường bắt buộc, sai định dạng, vượt quá độ dài, dữ liệu trùng lặp, dữ liệu sai lệch về logic nghiệp vụ).
* **Mục đích:**
  * Đánh giá khả năng xử lý ngoại lệ (*Exception Handling*) và cơ chế xác thực dữ liệu (*Validation*).
  * Đảm bảo hệ thống từ chối các dữ liệu không hợp lệ, không bị lỗi sập hệ thống (Crash/Unhandled Error 500), đồng thời phản hồi thông báo lỗi rõ ràng, thân thiện với người dùng (Mã phản hồi HTTP `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `409 Conflict`, `422 Unprocessable Entity`).

---

## 2. Phân loại các dạng đầu vào lỗi thường gặp trong báo cáo

| STT | Dạng đầu vào lỗi | Mô tả chi tiết | Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| 1 | **Bỏ trống (Missing Required Fields)** | Không nhập các trường bắt buộc (`@NotNull`, `@NotBlank`). | Để trống `Username`, `Password`, `Mã nhân viên`. |
| 2 | **Sai định dạng (Format / Pattern Error)** | Dữ liệu không khớp biểu thức chính quy (Regex). | Email nhập `abc@xyz` (thiếu domain), Số điện thoại chứa chữ cái `0912abc`. |
| 3 | **Giá trị biên / Độ dài (Boundary & Length Error)** | Vượt quá hoặc không đạt số lượng ký tự quy định. | Mật khẩu ít hơn 6 ký tự, Tên nhập quá 255 ký tự. |
| 4 | **Sai kiểu dữ liệu (Data Type Mismatch)** | Truyền sai kiểu dữ liệu hệ thống mong đợi. | ID/Phòng ban là số nguyên nhưng truyền chuỗi `ABC`, Ngày sinh truyền `31/02/2025`. |
| 5 | **Vi phạm tính duy nhất (Uniqueness / Conflict)** | Dữ liệu bị trùng khóa chính / trường có ràng buộc `UNIQUE`. | Thêm nhân viên với `Mã nhân viên` hoặc `Email` đã tồn tại trong DB. |
| 6 | **Sai logic nghiệp vụ (Business Logic Error)** | Dữ liệu hợp lệ về mặt cú pháp nhưng sai về ngữ cảnh nghiệp vụ. | `Ngày bắt đầu` > `Ngày kết thúc`; Giờ check-out xảy ra trước giờ check-in; Ca làm kết thúc sau ngày nghỉ việc. |
| 7 | **Quyền truy cập (Authorization Violation)** | Đầu vào hợp lệ nhưng người dùng không có thẩm quyền thực thi. | Nhân viên thường gửi request duyệt đơn nghỉ phép của nhân viên khác. |

---

## 3. Mẫu bảng thiết kế Test Case chi tiết (Áp dụng cho Hệ thống Quản lý Điểm danh - AMS)

### 3.1. Ca kiểm thử chức năng: Đăng nhập hệ thống (Login)

| Test Case ID | Tên ca kiểm thử | Loại đầu vào | Dữ liệu đầu vào (Input) | Kết quả mong đợi (Expected Output) | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC_AUTH_01** | Đăng nhập tài khoản hợp lệ | **Đầu vào chuẩn** | Username: `admin`<br>Password: `Admin@123` | Đăng nhập thành công, sinh JWT token, chuyển hướng vào Dashboard (HTTP 200). | Pass |
| **TC_AUTH_02** | Bỏ trống thông tin tài khoản | **Đầu vào lỗi** | Username: `(trống)`<br>Password: `Admin@123` | Hiển thị thông báo: *"Tên đăng nhập không được để trống"* (HTTP 400). | Pass |
| **TC_AUTH_03** | Bỏ trống mật khẩu | **Đầu vào lỗi** | Username: `admin`<br>Password: `(trống)` | Hiển thị thông báo: *"Mật khẩu không được để trống"* (HTTP 400). | Pass |
| **TC_AUTH_04** | Nhập sai mật khẩu | **Đầu vào lỗi** | Username: `admin`<br>Password: `SaiMatKhau999` | Hiển thị thông báo: *"Tài khoản hoặc mật khẩu không chính xác"* (HTTP 401). | Pass |
| **TC_AUTH_05** | Tài khoản bị khóa | **Đầu vào lỗi** | Username: `user_locked`<br>Password: `User@123` | Hiển thị thông báo: *"Tài khoản của bạn đã bị khóa, vui lòng liên hệ Admin"* (HTTP 403). | Pass |

---

### 3.2. Ca kiểm thử chức năng: Thêm mới Nhân viên (Create Employee)

| Test Case ID | Tên ca kiểm thử | Loại đầu vào | Dữ liệu đầu vào (Input) | Kết quả mong đợi (Expected Output) | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC_EMP_01** | Thêm nhân viên đầy đủ thông tin hợp lệ | **Đầu vào chuẩn** | Mã NV: `EMP001`<br>Họ tên: `Nguyễn Văn A`<br>Email: `vana@company.com`<br>Phòng ban: `IT (ID: 1)` | Thêm thành công, bản ghi lưu vào CSDL, hiển thị thông báo thành công (HTTP 201). | Pass |
| **TC_EMP_02** | Bỏ trống các trường bắt buộc | **Đầu vào lỗi** | Mã NV: `(trống)`<br>Họ tên: `(trống)`<br>Email: `test@company.com` | Báo lỗi validation: *"Mã NV và Họ tên không được để trống"* (HTTP 400). | Pass |
| **TC_EMP_03** | Email sai định dạng | **Đầu vào lỗi** | Mã NV: `EMP002`<br>Họ tên: `Trần B`<br>Email: `tranb@@gmail` | Báo lỗi: *"Định dạng email không hợp lệ"* (HTTP 400). | Pass |
| **TC_EMP_04** | Trùng Mã nhân viên đã tồn tại | **Đầu vào lỗi** | Mã NV: `EMP001` *(đã có trong DB)*<br>Họ tên: `Lê C`<br>Email: `lec@company.com` | Báo lỗi: *"Mã nhân viên đã tồn tại trong hệ thống"* (HTTP 409). | Pass |
| **TC_EMP_05** | Trùng Email đã tồn tại | **Đầu vào lỗi** | Mã NV: `EMP003`<br>Họ tên: `Phạm D`<br>Email: `vana@company.com` *(đã có)* | Báo lỗi: *"Email đã được sử dụng bởi nhân viên khác"* (HTTP 409). | Pass |

---

### 3.3. Ca kiểm thử chức năng: Quản lý Ca làm việc / Phân ca (Shift Assignment)

| Test Case ID | Tên ca kiểm thử | Loại đầu vào | Dữ liệu đầu vào (Input) | Kết quả mong đợi (Expected Output) | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC_SHIFT_01** | Tạo ca làm việc hợp lệ | **Đầu vào chuẩn** | Tên ca: `Ca Hành Chính`<br>Giờ bắt đầu: `08:00`<br>Giờ kết thúc: `17:30` | Tạo ca thành công, lưu cấu hình vào DB (HTTP 201). | Pass |
| **TC_SHIFT_02** | Giờ kết thúc trước giờ bắt đầu | **Đầu vào lỗi** | Tên ca: `Ca Sáng`<br>Giờ bắt đầu: `08:00`<br>Giờ kết thúc: `06:00` | Báo lỗi logic: *"Giờ kết thúc phải sau giờ bắt đầu ca làm"* (HTTP 400). | Pass |
| **TC_SHIFT_03** | Phân ca trùng lặp thời gian cho 1 nhân viên | **Đầu vào lỗi** | Nhân viên: `EMP001`<br>Ngày: `2026-08-25`<br>Ca: Ca 1 (08:00 - 12:00) & Ca 2 (10:00 - 14:00) | Báo lỗi: *"Nhân viên đã được phân ca trong khung giờ này"* (HTTP 409). | Pass |
