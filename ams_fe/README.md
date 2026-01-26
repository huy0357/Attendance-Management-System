# AMS Frontend - Attendance Management System

Angular Frontend Application cho hệ thống Quản lý Chấm công.

## Cấu trúc dự án

Dự án được tổ chức theo kiến trúc **Feature-based** với các module chính:

### Core Module (`src/app/core/`)
- **Services**: AuthService, StorageService, ApiService
- **Guards**: AuthGuard, RoleGuard
- **Interceptors**: AuthInterceptor, ErrorInterceptor
- **Models**: User model, AuthResponse

### Shared Module (`src/app/shared/`)
- **Components**: Button, Table, Input, Modal (reusable components)
- **Pipes**: CurrencyPipe, DateFormatPipe
- **Directives**: Custom directives

### Layout Module (`src/app/layout/`)
- **MainLayout**: Layout chính với Header, Sidebar, Breadcrumb
- **AuthLayout**: Layout cho các trang authentication

### Features Module (`src/app/features/`)
Các feature module được lazy load:

1. **auth** - Module Xác thực (AMS-22)
   - Login component với Tailwind CSS

2. **core** - Quản trị Hệ thống (AMS-12)
   - Dashboard
   - Organization (Tree View)

3. **hrm** - Quản lý Nhân sự (AMS-13)
   - Employee List (AMS-29)
   - Face Registration (AMS-159)

4. **attendance** - Chấm công & Ca làm việc (AMS-15)
   - Timesheet (AMS-105)
   - Shifts (AMS-44)
   - Calendar (AMS-51)

5. **payroll** - Lương & Phúc lợi (AMS-81)
   - Salary Dashboard (AMS-59)
   - KPI Input (AMS-58)

6. **reports** - Báo cáo & Dashboard (AMS-75)
   - Reports Dashboard (AMS-104)

7. **face-recognition** - Hệ thống nhận diện khuôn mặt (AMS-79)
   - Check-in Machine (AMS-49)

8. **chatbot** - Chatbot truy vấn thông minh (AMS-78)

## Tech Stack
- **Framework**: Angular 17+ (Standalone Components, Signals)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4+ & SCSS
- **State Management**: Signals (Angular Signals)

## Installation

### Prerequisites
- Node.js 18+
- Angular CLI 17+
- npm hoặc yarn

### Setup

1. **Cài đặt dependencies:**
   ```bash
   cd ams_fe
   npm install
   ```

2. **Cấu hình API Base URL:**
   - Cập nhật `baseUrl` trong `src/app/core/services/api.service.ts`
   - Hoặc tạo file `src/environments/environment.ts` và sử dụng

3. **Chạy development server:**
   ```bash
   ng serve
   # hoặc
   npm start
   ```

4. **Build production:**
   ```bash
   ng build --configuration production
   ```

## API Integration

### Authentication API
- **Login**: `POST /api/auth/login`
  - Request: `{ username: string, password: string }`
  - Response: `{ accessToken, refreshToken, tokenType, expiresInSeconds, username, role }`

- **Refresh Token**: `POST /api/auth/refresh`
  - Request: `{ refreshToken: string }`

- **Logout**: `POST /api/auth/logout`
  - Request: `{ refreshToken: string }`

## Routing

Tất cả các feature module sử dụng **Lazy Loading** để tối ưu performance.

Routes chính:
- `/auth/login` - Trang đăng nhập (Tailwind CSS)
- `/dashboard` - Dashboard chính
- `/hrm/employees` - Danh sách nhân viên
- `/attendance/timesheet` - Bảng công
- `/payroll/dashboard` - Dashboard lương
- `/reports/dashboard` - Báo cáo
- `/face-recognition/check-in` - Máy chấm công
- `/chatbot` - Chatbot

## Code Style
- Sử dụng **Barrel exports** (index.ts) cho cleaner imports
- **Smart/Dumb** component architecture
- Strict typing (no 'any')
- Semantic HTML và accessibility best practices
- **Tailwind CSS** cho styling với utility-first approach

## Features của Login Page

✅ **Giao diện đẹp với Tailwind CSS:**
- Gradient background
- Card design với shadow
- Icon integration
- Responsive design

✅ **UX Features:**
- Show/Hide password toggle
- Form validation với error messages
- Loading state với spinner
- Error handling với user-friendly messages
- Remember me checkbox
- Forgot password link

✅ **Accessibility:**
- Proper labels
- ARIA attributes
- Keyboard navigation
- Focus states
