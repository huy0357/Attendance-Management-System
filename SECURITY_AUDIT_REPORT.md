# SECURITY AUDIT REPORT

## 1) Tong quan He thong Phan quyen (RBAC Overview)

### Roles phat hien duoc
- `ADMIN`
- `HR`
- `MANAGER`
- `EMPLOYEE`

### Nguon xac nhan roles
- Backend: `UserPrincipal` normalize authority theo format `ROLE_<ROLE_CODE>` (`ams_be/src/main/java/org/example/ams_be/security/UserPrincipal.java`).
- Backend: Security matcher va PreAuthorize su dung truc tiep `ADMIN/HR/MANAGER/EMPLOYEE` (`ams_be/src/main/java/org/example/ams_be/config/SecurityConfig.java`, cac controller).
- Frontend: Route guards va menu visibility dung cung bo role (`ams_fe/src/app/app-routing.module.ts`, `ams_fe/src/app/core/layout/admin-layout/admin-layout.component.ts`).

### Quyen han thiet ke (theo code hien tai)
- `ADMIN`: truy cap khu `admin`, quan ly account, nhieu chuc nang HRM/Attendance.
- `HR`: truy cap mot so khu HRM/Attendance.
- `MANAGER`: truy cap cac man hinh manager flow (vd. queue duyet requests).
- `EMPLOYEE`: truy cap self-service (portal, leave/requests, attendance me).

---

## 2) Nhung diem DA LAM DUNG (Strengths)

1. **FE route-level protection da co cau truc ro rang**
   - Root route bat buoc `AuthGuard` (`ams_fe/src/app/app-routing.module.ts`).
   - Khu `/admin` duoc khoa boi `RoleGuard` role `ADMIN`.
   - Khu attendance/hrm da gan role cho tung route con (`attendance-routing.module.ts`, `hrm-routing.module.ts`).

2. **FE UI visibility da duoc role-gate o menu chinh**
   - Sidebar filter item theo `requiredRoles` + `authService.hasAnyRole(...)`.
   - Giam rui ro lo chuc nang nhay cam tren giao dien cho role khong hop le.

3. **Mot so luong nghiep vu Requests co ownership check trong service**
   - `submit/update/delete` co so sanh `employeeId` voi owner cua request.
   - Giup han che sua/xoa sai doi tuong neu caller truyen dung employeeId.

4. **JWT stateless flow duoc thiet lap**
   - Dung `JwtAuthFilter`, session `STATELESS`, co kiem tra token type (`access`).

---

## 3) Vulnerabilities / Bugs (co muc do nghiem trong)

> Luu y: Danh gia theo goc nhin bao mat backend la "source of truth".  
> Neu FE chan/hidden ma BE khong chan thi van la lo hong nghiem trong.

### [HIGH] V-01: Method-level authorization co kha nang KHONG hoat dong toan cuc
- **Vi tri**:
  - `ams_be/src/main/java/org/example/ams_be/config/SecurityConfig.java`
  - Toan bo cac cho dung `@PreAuthorize(...)` trong controllers
- **Bang chung**:
  - Khong tim thay `@EnableMethodSecurity` / `@EnableGlobalMethodSecurity` trong codebase backend.
- **Tac dong**:
  - Neu method security khong duoc bat, cac `@PreAuthorize` se **khong co hieu luc**.
  - Khi do, chi con `requestMatchers` trong `SecurityConfig` lam lop bao ve duy nhat.
- **Kich ban khai thac**:
  - Endpoint du kien chi cho `ADMIN/HR/MANAGER` nhung khong nam trong matcher chat che co the bi user thuong truy cap neu da authenticated.

### [HIGH] V-02: IDOR tren Requests detail (`GET /api/requests/{id}`)
- **Vi tri**:
  - Controller: `ams_be/src/main/java/org/example/ams_be/controller/RequestsController.java` (method `getById`)
  - Service: `ams_be/src/main/java/org/example/ams_be/service/RequestsService.java` (method `getRequestById`)
- **Bang chung**:
  - API lay theo `id` truc tiep, **khong doi chieu caller voi owner**.
  - Service `getRequestById` chi `findById(id)` va tra DTO.
- **Tac dong**:
  - EMPLOYEE co the doan `id` va doc thong tin don nghi/OT cua nguoi khac.
- **Ket qua mong doi dung**:
  - Truong hop khong phai owner/role duoc phep phai tra `403 Forbidden` (hoac `404` de giam enumeration).

### [HIGH] V-03: IDOR/Privilege bypass qua query param `employeeId` o Requests APIs
- **Vi tri**:
  - `GET /api/requests?employeeId=...`
  - `PUT /api/requests/{id}/submit?employeeId=...`
  - `PUT /api/requests/{id}?employeeId=...`
  - `DELETE /api/requests/{id}?employeeId=...`
  - File: `RequestsController.java`, `RequestsService.java`
- **Bang chung**:
  - Backend tin vao `employeeId` client truyen len thay vi lay tu token principal.
  - Ownership check co ton tai, nhung dua vao gia tri `employeeId` do client tu khai.
- **Tac dong**:
  - Attacker co the thao tung `employeeId` theo y muon de doc/sua theo du lieu ngoai y dinh.
  - Kha nang bypass tuy thuoc tung ham va rang buoc nghiep vu, nhung design hien tai la nguy co cao.

### [HIGH] V-04: Endpoint employee attendance theo `employeeId` khong chan role/ownership
- **Vi tri**:
  - `ams_be/src/main/java/org/example/ams_be/controller/AttendanceDailyController.java`
  - API: `GET /api/attendance-daily/employee/{employeeId}`
- **Bang chung**:
  - Method khong co `@PreAuthorize`.
  - Dung path variable `employeeId` truc tiep, khong doi chieu voi principal.
  - `SecurityConfig` cho `/api/attendance-daily/employee/**` la `.authenticated()`.
- **Tac dong**:
  - Moi user da dang nhap co the xem cham cong cua employee bat ky neu biet ID.
- **Kich ban**:
  - EMPLOYEE A goi `/api/attendance-daily/employee/2?from=...&to=...` van lay du lieu EMPLOYEE B.

### [HIGH] V-05: Account APIs khong co role check (co the bi user thuong thao tac)
- **Vi tri**:
  - `ams_be/src/main/java/org/example/ams_be/controller/AccountController.java`
  - `ams_be/src/main/java/org/example/ams_be/config/SecurityConfig.java`
- **Bang chung**:
  - `AccountController` khong co `@PreAuthorize` class/method.
  - SecurityConfig chi `permitAll` cho `POST /api/accounts`, con API khac roi vao `.anyRequest().authenticated()`.
- **Tac dong**:
  - User authenticated (kể ca EMPLOYEE) co the goi:
    - `GET /api/accounts`, `GET /api/accounts/{id}`
    - `PUT /api/accounts/{id}`, `DELETE /api/accounts/{id}`
  - Dan den rui ro takeover/vo hieu hoa tai khoan.

### [HIGH] V-06: Role assignment endpoints co nguy co privilege escalation
- **Vi tri**:
  - `ams_be/src/main/java/org/example/ams_be/controller/RoleController.java`
  - APIs:
    - `POST /api/employees/{employeeId}/roles`
    - `DELETE /api/employees/{employeeId}/roles/{roleId}`
- **Bang chung**:
  - RoleController khong gan `@PreAuthorize`.
  - Path nam duoi `/api/employees/**`; SecurityConfig dang cho `hasAnyRole("EMPLOYEE", "ADMIN")`.
- **Tac dong**:
  - EMPLOYEE co the tu gan role cao hon (neu biet roleId), dan den leo thang dac quyen.

### [HIGH] V-07: Nhiều endpoint nhay cam chi can "authenticated"
- **Vi tri tieu bieu**:
  - `DepartmentController` (`/api/departments/**`) - khong role check.
  - `ShiftTemplateController` (`/api/v1/shifts/**`) - khong role check.
  - `EmployeeScheduleController` (`/api/v1/schedules/**`) - khong role check.
  - `AttendanceMonthlySummaryController` (`/api/monthly-summary/generate`) - khong role check.
  - `AttendanceEmailController` (`/api/attendance-email/send`, `/send-all`) - khong role check.
  - `AttendanceDashboardController` (`/api/v1/dashboard/**`) - khong role check.
  - `AttendanceExportController` + `EmployeeExportController` (`/api/exports/**`) - khong role check.
- **Tac dong**:
  - Bat ky user da dang nhap co the goi API quan tri/he thong neu khong co matcher rieng.
  - Rui ro rò ri data hang loat va thao tac trai phep.

### [MEDIUM] V-08: Sai khop FE-BE endpoint role APIs
- **Vi tri**:
  - FE: `ams_fe/src/app/features/hrm/employees/employee.service.ts`
  - FE goi: `/api/employees/{id}/roles` qua `baseUrl`.
  - BE implement trong `RoleController` voi prefix `/api` + `/employees/{id}/roles` (tuong duong URL), nhung logic role governance khong the hien ro.
- **Tac dong**:
  - De gay nham lan ownership va governance.
  - Lam tang nguy co FE tin rang chi admin thao tac, trong khi BE chua khoa chat.

### [MEDIUM] V-09: FE chi hidden UI, khong thay the duoc backend authorization
- **Vi tri**:
  - `attendance-email.component.html` an mot so action theo role.
  - `admin-layout.component.ts` filter menu theo role.
  - `department-list.component.html` hien nut CRUD khong role condition o component.
- **Tac dong**:
  - Nguoi dung co the bo qua UI, goi API truc tiep.
  - Neu BE khong chan role thi hidden UI khong co gia tri bao mat.

### [LOW] V-10: Security matcher co thiet ke de gay hieu nham
- **Vi tri**:
  - `SecurityConfig` co rule `/api/employees/**` -> `hasAnyRole("EMPLOYEE", "ADMIN")`.
- **Tac dong**:
  - Ve mat policy, endpoint employees thuong la nhay cam; cho EMPLOYEE truy cap rong la khong phu hop nguyen tac least privilege.
  - De tao bug logic khi dev tuong rang da co `@PreAuthorize` o controller.

---

## 4) Kiem tra yeu cau cu the (Backend/Frontend/Cross-check)

### 4.1 Backend Spring Security & API Protection
- Roles xac nhan: `ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`.
- Nhieu API khong duoc bao ve boi `@PreAuthorize/@Secured` va cung khong co matcher role chat che.
- Co IDOR ro rang o cac API truy van theo `id`/`employeeId` client truyen.
- Cau hoi mau "EMPLOYEE goi `/api/leave-requests/{id}`":
  - Du an nay su dung `/api/requests/{id}`.
  - Theo code hien tai, backend **khong dam bao 403** cho truong hop truy cap request cua nguoi khac.
  - Thuc te hien tai co nguy co tra du lieu thay vi chan.

### 4.2 Frontend Angular Guards & UI Visibility
- `AuthGuard` + `RoleGuard` co hoat dong route-level.
- Kich ban "EMPLOYEE go URL `/admin/account-management`":
  - Trong FE route config, route `/admin` yeu cau role `ADMIN`.
  - Guard se redirect ve `/dashboard` neu role khong hop le.
- Tuy nhien, day chi la lop UX/client-side; khong thay the authorization backend.

### 4.3 Cross-check FE vs BE (bat dong bo)
1. **FE chan route/admin UI, BE lai mo nhieu endpoint quan tri cho authenticated user**.
2. **FE an nut/flow theo role, nhung BE chua co enforcement dong bo** (department/account/attendance-email/export/...).
3. **FE co role matrix kha ro, BE policy thuc te con long leo qua matcher + thieu method security global**.

---

## 5) Recommendations (KHONG auto-fix, chi huong dan)

### A. Khoa authorization o backend la uu tien #1
1. Bat method security toan cuc (de `@PreAuthorize` co hieu luc).
2. Dinh nghia policy role ro rang cho tung module:
   - Accounts, Roles, Departments, Exports, Dashboard, Attendance Email, Monthly Summary, Shifts, Schedules.
3. Ap dung `@PreAuthorize` tai class/method va dong bo voi request matchers.
4. Giam `anyRequest().authenticated()` cho endpoint nhay cam; uu tien matcher explicit theo role.

### B. Chong IDOR bat buoc
1. Tuyet doi khong tin `employeeId` tu query/body cho self-service APIs.
2. Lay identity tu `Authentication principal`/JWT claims.
3. Kiem tra ownership server-side tai service/repository:
   - Neu khong trung owner va khong co role dac biet -> `403`.
4. Xem xet tra `404` cho object khong thuoc scope truy cap de giam object enumeration.

### C. Bao ve endpoint role/account quan tri
1. APIs gan/xoa role chi cho `ADMIN` (va co audit log day du).
2. APIs account CRUD chi cho `ADMIN` (hoac role duoc phep ro rang).
3. Dat extra business rules chong self-escalation/self-demotion nguy hiem.

### D. Dong bo FE-BE governance
1. Dung FE role guard/UI visibility chi la UX layer.
2. Xuat "authorization matrix" chinh thuc (role x action x endpoint).
3. Viet integration test cho cac case:
   - EMPLOYEE truy cap API admin -> 403.
   - EMPLOYEE truy cap object cua nguoi khac -> 403/404.
   - MANAGER/HR chi truy cap scope duoc cap.

### E. Bo sung security test tu dong
1. Them test negative cho tat ca endpoint nhay cam.
2. Them regression test cho moi bug authorization sau khi fix.
3. Theo doi audit log cho hanh vi truy cap trai phep.

---

## 6) Ket luan ngan

He thong FE da co nen tang guard va hidden UI kha tot, nhung backend authorization hien tai co nhieu diem mo va IDOR nghiem trong.  
Muc do rui ro tong the: **HIGH** cho production neu chua harden backend policy va ownership checks.

