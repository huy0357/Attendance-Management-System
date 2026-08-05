# TÀI LIỆU TỔNG HỢP API & HƯỚNG DẪN TÍCH HỢP FRONTEND (AMS BE INTEGRATION GUIDE)

> **Dự án**: Attendance Management System - Backend (`ams_be`)  
> **Cập nhật lần cuối**: 04/08/2026  
> **Kiến trúc Bảo mật**: JWT Authentication (`Bearer Token`), Refresh Token Rotation, RBAC (Role-Based Access Control)

---

## 📌 I. QUY TẮC CHUNG CHO FRONTEND (GENERAL RULES)

### 1. Base URL & Header Xác thực
* **Base URL**: `http://localhost:8080` (hoặc URL của Server Staging/Production).
* **Header bắt buộc đối với các API cần đăng nhập**:
  ```http
  Authorization: Bearer <accessToken>
  Content-Type: application/json
  ```

### 2. Cấu trúc Response Chuẩn
Hệ thống trả về 2 dạng Response chính:

#### a. Response Đơn (ApiResponse Wrapper)
```json
{
  "success": true,
  "data": { ... },
  "message": "Thông báo thành công",
  "errorCode": null
}
```

#### b. Response Phân trang (PageResponse Wrapper)
```json
{
  "content": [ ... ],
  "page": 1,
  "size": 10,
  "totalElements": 100
}
```

### 3. Cơ chế Xử lý Token hết hạn (Interceptor Strategy)
* Khi **Access Token** hết hạn, BE trả về HTTP Status `401 Unauthorized`.
* FE cài đặt **Axios / Fetch Interceptor**:
  1. Đón lỗi `401`.
  2. Gửi request `POST /api/auth/refresh` với payload `{ "refreshToken": "..." }`.
  3. Lưu lại `accessToken` và `refreshToken` mới được cấp.
  4. Thực hiện lại request ban đầu bị lỗi.
  5. Nếu refresh token cũng hỏng/hết hạn -> Chuyển hướng người dùng về màn hình `/login`.

---

## 📜 II. DANH SÁCH CHI TIẾT API THEO NGHỆP VỤ (API ENDPOINTS REFERENCE)

---

### 1. Phân hệ Xác thực & Quản lý Mật khẩu (`/api/auth`)

| HTTP Method | API Endpoint | Quyền truy cập | Mô tả & Tham số |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | **Public** | Đăng nhập tài khoản.<br>**Body**: `{ "username": "admin", "password": "..." }`<br>**Res**: `{ accessToken, refreshToken, accessTtl, username, roleCode }` |
| `POST` | `/api/auth/refresh` | **Public** | Đổi Access Token mới.<br>**Body**: `{ "refreshToken": "..." }` |
| `POST` | `/api/auth/logout` | **Public** | Đăng xuất (Thu hồi Refresh Token).<br>**Body**: `{ "refreshToken": "..." }` |
| `POST` | `/api/auth/forgot-password` | **Public** | Gửi mã OTP khôi phục mật khẩu qua email.<br>**Body**: `{ "email": "user@company.com" }` |
| `POST` | `/api/auth/verify-otp` | **Public** | Xử lý kiểm tra mã OTP.<br>**Body**: `{ "email": "...", "otp": "123456" }` |
| `POST` | `/api/auth/reset-password` | **Public** | Đặt lại mật khẩu mới.<br>**Body**: `{ "email": "...", "otp": "123456", "newPassword": "..." }` |

---

### 2. Phân hệ Hồ sơ Cá nhân (`/api/v1/profile`)

| HTTP Method | API Endpoint | Quyền truy cập | Mô tả & Tham số |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/profile/me` | `EMPLOYEE`, `MANAGER`, `ADMIN` | Lấy thông tin cá nhân của User đang đăng nhập. |
| `PUT` | `/api/v1/profile/me` | `EMPLOYEE`, `MANAGER`, `ADMIN` | Cập nhật thông tin cá nhân (Họ tên, SĐT, Ngày sinh, Email...). |
| `POST` | `/api/v1/profile/avatar` | `EMPLOYEE`, `MANAGER`, `ADMIN` | Upload Ảnh Đại diện cá nhân (Lưu trữ MinIO Cloud).<br>**Form Data**: `file` (MultipartFile) |

---

### 3. Phân hệ Quản lý Nhân sự (`/api/employees`)

| HTTP Method | API Endpoint | Quyền truy cập | Mô tả & Tham số |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/employees` | `ADMIN` | Lấy toàn bộ danh sách nhân viên. |
| `GET` | `/api/employees/{id}` | `ADMIN` | Lấy thông tin chi tiết 1 nhân viên theo ID. |
| `POST` | `/api/employees` | `ADMIN` | Tạo nhân viên mới.<br>**Body**: `EmployeeRequest` |
| `PUT` | `/api/employees/{id}` | `ADMIN` | Cập nhật thông tin nhân viên. |
| `DELETE` | `/api/employees/{id}` | `ADMIN` | Xóa nhân viên. |
| `GET` | `/api/employees/page` | `ADMIN` | Danh sách nhân viên phân trang.<br>**Params**: `page`, `size`, `sortBy`, `sortDir` |
| `GET` | `/api/employees/search` | `ADMIN` | Tìm kiếm nhân viên theo tên.<br>**Params**: `name`, `page`, `size`, `sortBy`, `sortDir` |

---

### 4. Phân hệ Quản lý Tài khoản & Phân quyền (`/api/accounts` & `/api/roles`)

| HTTP Method | API Endpoint | Quyền truy cập | Mô tả & Tham số |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/accounts` | `ADMIN` | Lấy toàn bộ tài khoản hệ thống. |
| `GET` | `/api/accounts/{id}` | `ADMIN` | Xem chi tiết 1 tài khoản. |
| `POST` | `/api/accounts` | `ADMIN` | Tạo tài khoản đăng nhập cho nhân viên.<br>**Body**: `{ "employeeId": 1, "username": "...", "password": "...", "roleId": 2 }` |
| `PUT` | `/api/accounts/{id}` | `ADMIN` | Cập nhật thông tin tài khoản (Dổi role, Đổi username, Active/Inactive). |
| `DELETE` | `/api/accounts/{id}` | `ADMIN` | Xóa tài khoản. |
| `GET` | `/api/accounts/page` | `ADMIN` | Phân trang tài khoản (Lọc theo `isActive`). |
| `GET` | `/api/accounts/search` | `ADMIN` | Tìm kiếm tài khoản theo username. |
| `GET` | `/api/roles` | `ADMIN` | Danh sách danh mục Vai trò trong hệ thống. |
| `GET` | `/api/employees/{employeeId}/roles` | `ADMIN` | Xem danh sách vai trò của 1 nhân viên. |
| `POST` | `/api/employees/{employeeId}/roles` | `ADMIN` | Gán vai trò cho nhân viên.<br>**Body**: `{ "roleId": 1 }` |
| `DELETE` | `/api/employees/{employeeId}/roles/{roleId}` | `ADMIN` | Thu hồi vai trò của nhân viên. |

---

### 5. Phân hệ Quản lý Phòng ban (`/api/departments`)

| HTTP Method | API Endpoint | Quyền truy cập | Mô tả & Tham số |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/departments` | `ADMIN` | Lấy danh sách phòng ban (Phân trang + Tìm kiếm `keyword`). |
| `GET` | `/api/departments/{id}` | `ADMIN` | Lấy chi tiết phòng ban. |
| `POST` | `/api/departments` | `ADMIN` | Tạo mới phòng ban. |
| `PUT` | `/api/departments/{id}` | `ADMIN` | Cập nhật phòng ban. |
| `DELETE` | `/api/departments/{id}` | `ADMIN` | Xóa phòng ban. |
| `GET` | `/api/departments/tree` | `ADMIN` | Lấy cây cơ cấu tổ chức phòng ban (Parent - Child Tree). |

---

### 6. Phân hệ Ca làm việc & Xếp lịch (`/api/v1/shifts` & `/api/v1/schedules`)

| HTTP Method | API Endpoint | Quyền truy cập | Mô tả & Tham số |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/shifts` | `ADMIN` | Danh sách ca làm việc mẫu (`active`, search `q`). |
| `GET` | `/api/v1/shifts/{id}` | `ADMIN` | Chi tiết ca làm việc. |
| `POST` | `/api/v1/shifts` | `ADMIN` | Tạo ca làm việc mới (Cấu hình ca đêm `isNightShift`, `breakMinutes`, `graceInMinutes`...). |
| `PUT` | `/api/v1/shifts/{id}` | `ADMIN` | Cập nhật ca làm việc. |
| `PATCH` | `/api/v1/shifts/{id}/active` | `ADMIN` | Bật/tắt trạng thái hoạt động ca mẫu (`active=true/false`). |
| `DELETE` | `/api/v1/shifts/{id}` | `ADMIN` | Xóa ca làm việc mẫu. |
| `POST` | `/api/v1/schedules/assign-range` | `EMPLOYEE`, `MANAGER`, `ADMIN` | Phân ca làm việc theo khoảng ngày.<br>**Body**: `{ "employeeIds": [1, 2], "shiftId": 10, "startDate": "2026-08-01", "endDate": "2026-08-31" }` |
| `GET` | `/api/v1/schedules/by-employee/day` | `EMPLOYEE`, `MANAGER`, `ADMIN` | Xem lịch làm việc của 1 nhân viên trong 1 ngày cụ thể.<br>**Params**: `employeeId`, `date` |

---

### 7. Phân hệ Bảng công Hàng ngày (`/api/attendance-daily`)

| HTTP Method | API Endpoint | Quyền truy cập | Mô tả & Tham số |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/attendance-daily/me` | `EMPLOYEE`, `MANAGER`, `ADMIN` | **Cá nhân xem bảng công của chính mình**.<br>**Params**: `from` (yyyy-MM-dd), `to` (yyyy-MM-dd), `page`, `size` |
| `GET` | `/api/attendance-daily/employee/{employeeId}` | `EMPLOYEE`, `MANAGER`, `ADMIN` | Xem bảng công của 1 nhân viên cụ thể. |
| `GET` | `/api/attendance-daily/admin` | `ADMIN` | **Admin/HR xem toàn bộ bảng công công ty**.<br>**Params**: `from`, `to`, `page`, `size` |
| `POST` | `/api/attendance-daily/debug-run` | `ADMIN` | Kích hoạt tính công thủ công cho 1 ngày.<br>**Params**: `date=2026-08-04` |

---

### 8. Phân hệ Quản lý Đơn từ (`/api/requests`)

| HTTP Method | API Endpoint | Quyền truy cập | Mô tả & Tham số |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/requests` | `EMPLOYEE`, `MANAGER`, `ADMIN` | **Tạo đơn mới (DRAFT)**.<br>**Body**: `{ "employeeId": 1, "requestType": "LEAVE", "title": "Nghỉ phép", "startDatetime": "...", "endDatetime": "..." }` |
| `GET` | `/api/requests` | `EMPLOYEE`, `MANAGER`, `ADMIN` | **Danh sách đơn cá nhân (My Requests)**.<br>**Params**: `employeeId`, `status`, `type`, `page`, `size` |
| `GET` | `/api/requests/{id}` | `EMPLOYEE`, `MANAGER`, `ADMIN` | Xem chi tiết 1 đơn từ. |
| `PUT` | `/api/requests/{id}` | `EMPLOYEE`, `MANAGER`, `ADMIN` | Cập nhật thông tin đơn (khi đang ở `DRAFT` hoặc `SUBMITTED`). |
| `PUT` | `/api/requests/{id}/submit` | `EMPLOYEE`, `MANAGER`, `ADMIN` | **Nộp đơn chính thức (Chuyển sang SUBMITTED)**.<br>**Params**: `employeeId` |
| `DELETE` | `/api/requests/{id}` | `EMPLOYEE`, `MANAGER`, `ADMIN` | Xóa đơn (chỉ xóa được đơn `DRAFT`). |
| `GET` | `/api/requests/manager-queue` | `MANAGER`, `ADMIN` | **Hàng đợi duyệt đơn dành cho Manager**.<br>**Params**: `managerId`, `status`, `type`, `page`, `size` |
| `PUT` | `/api/requests/{id}/approval` | `MANAGER`, `ADMIN` | **Manager Duyệt hoặc Từ chối đơn**.<br>**Body**: `{ "approverId": 8, "status": "APPROVED", "decisionNote": "Đồng ý" }` |
| `GET` | `/api/requests/all` | `ADMIN` | **Admin/HR xem toàn bộ đơn từ hệ thống**.<br>**Params**: `status`, `type`, `page`, `size` |

---

### 9. Phân hệ Báo cáo Tổng hợp Tháng (`/api/monthly-summary` & `/api/attendance-email`)

| HTTP Method | API Endpoint | Quyền truy cập | Mô tả & Tham số |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/monthly-summary/me` | `EMPLOYEE`, `MANAGER`, `ADMIN` | **Xem tổng hợp công tháng cá nhân** (Tự động fallback tính realtime nếu tháng chưa đóng).<br>**Params**: `month=2026-08` |
| `GET` | `/api/monthly-summary/employee/{employeeId}` | `ADMIN` | Xem tổng hợp công tháng của 1 nhân viên cụ thể. |
| `GET` | `/api/monthly-summary/admin` | `ADMIN` | Xem tổng hợp công tháng toàn bộ nhân sự công ty. |
| `POST` | `/api/monthly-summary/generate` | `ADMIN` | Chốt dữ liệu công tháng thủ công.<br>**Params**: `month=2026-08` |
| `POST` | `/api/attendance-email/send` | `ADMIN` | Gửi email báo cáo công tháng cho 1 nhân viên.<br>**Params**: `month`, `employeeId`, `regenerate` |
| `POST` | `/api/attendance-email/send-all` | `ADMIN` | Gửi email báo cáo công tháng cho toàn bộ nhân sự.<br>**Params**: `month`, `regenerate` |

---

### 10. Phân hệ Realtime Dashboard & Exceptions (`/api/v1/dashboard`)

| HTTP Method | API Endpoint | Quyền truy cập | Mô tả & Tham số |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/dashboard/kpi` | `MANAGER`, `ADMIN` | Thống kê KPI tổng quan (Số người đi làm, đi trễ, vắng mặt, đơn chờ duyệt).<br>**Params**: `date`, `branchIds`, `timezone` |
| `GET` | `/api/v1/dashboard/live-pulse` | `MANAGER`, `ADMIN` | Luồng sự kiện check-in realtime gần nhất.<br>**Params**: `limit`, `since`, `includeCheckOut` |
| `GET` | `/api/v1/dashboard/exceptions` | `MANAGER`, `ADMIN` | Danh sách ngoại lệ chấm công cần xử lý.<br>**Params**: `status`, `severity`, `limit`, `offset` |
| `POST` | `/api/v1/dashboard/exceptions/{id}/resolve` | `MANAGER`, `ADMIN` | Giải quyết ngoại lệ chấm công.<br>**Body**: `{ "notes": "Đã xác minh" }` |
| `WS` | `/ws/dashboard` | `MANAGER`, `ADMIN` | Socket Realtime đệm dữ liệu sự kiện quẹt mặt trực tiếp lên màn hình Dashboard. |

---

### 11. Phân hệ Xuất Báo Cáo Excel (`/api/exports`)

| HTTP Method | API Endpoint | Quyền truy cập | Mô tả & Tham số |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/exports/employees` | `ADMIN` | Tải về file Excel danh sách nhân viên (`employees.xlsx`). |
| `GET` | `/api/exports/attendance-monthly` | `ADMIN` | Tải về file Excel tổng hợp công tháng (`attendance_monthly_yyyy-MM.xlsx`).<br>**Params**: `month=2026-08` |

---

### 12. Phân hệ Nhật ký Hệ thống & Batch Control (`/api/audit-logs` & `/api/admin/attendance`)

| HTTP Method | API Endpoint | Quyền truy cập | Mô tả & Tham số |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/audit-logs` | `ADMIN` | Phân trang danh sách nhật ký hệ thống truy vết thao tác CRUD/Auth.<br>**Params**: `entityType`, `action`, `actorId`, `page`, `size` |
| `GET` | `/api/audit-logs/{id}` | `ADMIN` | Xem chi tiết log kèm `oldValue` và `newValue`. |
| `POST` | `/api/admin/attendance/run-batch` | `ADMIN` | Chạy Batch tính toán công thủ công cho 1 ngày.<br>**Params**: `date=2026-08-04` |

---

## 💻 III. CÁC MÀN HÌNH FRONTEND CẦN XÂY DỰNG (FE PAGES & COMPONENTS)

Dựa trên cấu trúc API, Frontend có thể chia thành 3 Portal chính:

### 1. Portal Dành Cho Nhân Viên (Employee Portal)
* **Trang Login / Quên Mật Khẩu**: Đăng nhập, gửi OTP reset mật khẩu.
* **Trang Hồ sơ Cá nhân (Profile)**: Xem thông tin, sửa thông tin, đổi avatar (MinIO).
* **Trang Lịch làm việc & Ca làm (My Schedule)**: Xem lịch phân ca của bản thân.
* **Trang Bảng công Cá nhân (My Attendance)**: Xem chi tiết quẹt thẻ, giờ trễ/về sớm, giờ OT theo khoảng ngày hoặc theo tháng.
* **Trang Quản lý Đơn từ (My Requests)**: 
  * Tạo đơn nháp (`DRAFT`), sửa đơn, nộp đơn (`SUBMITTED`), xóa đơn.
  * Lọc danh sách đơn theo loại (`LEAVE`, `LATE_EARLY`, `OVERTIME`, `REMOTE`) và trạng thái.

### 2. Portal Dành Cho Quản Lý (Manager Portal)
* **Trang Duyệt Đơn (Manager Queue)**:
  * Xem danh sách các đơn cấp dưới nộp chờ duyệt.
  * Phê duyệt (`APPROVED`) hoặc Từ chối (`REJECTED`) kèm lý do `decisionNote`.
* **Trang Realtime Dashboard**:
  * Widget thống kê KPI trong ngày.
  * Live Pulse stream quẹt mặt (WebSocket).
  * Danh sách ngoại lệ (Exceptions) & Nút xử lý ngoại lệ.

### 3. Portal Dành Cho Quản Trị Viên / HR (Admin Portal)
* **Trang Quản lý Nhân sự**: Danh sách nhân viên, thêm mới, sửa, xóa, tìm kiếm, xuất file Excel nhân viên.
* **Trang Quản lý Tài khoản & Phân quyền**: Tạo tài khoản, gán role `ADMIN`/`MANAGER`/`EMPLOYEE`, khóa/mở khóa tài khoản.
* **Trang Quản lý Cơ cấu Tổ chức**: Danh mục phòng ban, hiển thị sơ đồ cây phòng ban.
* **Trang Cấu hình Ca làm việc**: Thêm/Sửa/Xóa mẫu ca (`ShiftTemplate`), bật/tắt ca mẫu, cấu hình ca đêm.
* **Trang Xếp Lịch Làm Việc (Shift Assignment)**: Gán ca làm việc theo dải ngày cho nhiều nhân viên cùng lúc.
* **Trang Quản lý Bảng công Toàn công ty**:
  * Xem bảng công tổng của toàn bộ nhân viên.
  * Kích hoạt chạy Batch tính công thủ công.
* **Trang Tổng hợp Công tháng & Email**:
  * Chốt công tháng, xem bảng tổng hợp công tháng toàn công ty.
  * Nút bấm gửi Email báo cáo công tháng cho 1 nhân viên hoặc tất cả nhân viên.
  * Tải file Excel báo cáo công tháng.
* **Trang Audit Log**: Truy vết nhật ký hệ thống.
