import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../core/auth/ProtectedRoute';
import RoleRoute from '../core/auth/RoleRoute';
import AdminLayout from '../core/layout/AdminLayout';
import { useAuth } from '../core/auth/AuthContext';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const LoginPage = lazy(() => import('../features/auth/login/LoginPage'));

// Dashboard
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'));

// HRM
const EmployeePortalPage = lazy(() => import('../features/hrm/employee-portal/EmployeePortalPage'));
const EmployeesPage = lazy(() => import('../features/hrm/employees/EmployeesPage'));
const DepartmentsPage = lazy(() => import('../features/hrm/departments/DepartmentsPage'));


// Attendance
const AttendanceDailyPage = lazy(() => import('../features/attendance/attendance-daily/AttendanceDailyPage'));
const RequestsManagementPage = lazy(() => import('../features/attendance/requests-management/RequestsManagementPage'));
const LeaveManagementPage = lazy(() => import('../features/attendance/leave-management/LeaveManagementPage'));
const SchedulingPage = lazy(() => import('../features/attendance/scheduling/SchedulingPage'));
const ShiftTemplatesPage = lazy(() => import('../features/attendance/shift-templates/ShiftTemplatesPage'));
const AttendanceEmailPage = lazy(() => import('../features/attendance/attendance-email/AttendanceEmailPage'));
const MySchedulePage = lazy(() => import('../features/attendance/my-schedule/MySchedulePage'));
const MonthlySummaryPage = lazy(() => import('../features/attendance/monthly-summary/MonthlySummaryPage'));

// Admin
const AccountManagementPage = lazy(() => import('../features/admin/account-management/AccountManagementPage'));
const AuditLogPage = lazy(() => import('../features/admin/audit-log/AuditLogPage'));
const SettingsPage = lazy(() => import('../features/admin/settings/SettingsPage'));
const ProfilePage = lazy(() => import('../features/admin/profile/ProfilePage'));
const RoleManagementPage = lazy(() => import('../features/admin/role-management/RoleManagementPage'));
const DataExportsPage = lazy(() => import('../features/admin/data-exports/DataExportsPage'));
const BatchProcessingPage = lazy(() => import('../features/admin/batch-processing/BatchProcessingPage'));


// Error Pages
const NotFoundPage = lazy(() => import('../features/error/NotFoundPage'));
const ServerErrorPage = lazy(() => import('../features/error/ServerErrorPage'));

// ── Spinner fallback ─────────────────────────────────────────────────────────
const PageSpinner = () => (
  <div className="flex-1 flex items-center justify-center h-full min-h-[60vh]">
    <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
  </div>
);

// ── Home Redirect Component ───────────────────────────────────────────────────
const HomeRedirect = () => {
  const { hasAnyRole } = useAuth();
  if (hasAnyRole(['ADMIN', 'HR', 'MANAGER'])) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/hrm/employee-portal" replace />;
};

// ── Routes ────────────────────────────────────────────────────────────────────
const AppRouter: React.FC = () => (
  <Suspense fallback={<PageSpinner />}>
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — requires authentication */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<HomeRedirect />} />

          {/* ── ALL authenticated roles (EMPLOYEE, MANAGER, HR, ADMIN) ───── */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/hrm/employee-portal" element={<EmployeePortalPage />} />
          <Route path="/attendance/attendance-daily" element={<AttendanceDailyPage />} />
          <Route path="/attendance/my-schedule" element={<MySchedulePage />} />
          <Route path="/attendance/requests-management" element={<RequestsManagementPage />} />
          <Route path="/attendance/leave-management" element={<LeaveManagementPage />} />
          <Route path="/attendance/my-monthly-summary" element={<MonthlySummaryPage />} />

          {/* ── ADMIN + HR + MANAGER ─────────────────────────────────────── */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']} redirectTo="/hrm/employee-portal" />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/attendance/scheduling" element={<SchedulingPage />} />
            <Route path="/attendance/monthly-summary" element={<MonthlySummaryPage />} />
            <Route path="/attendance/attendance-daily/admin" element={<AttendanceDailyPage />} />
            <Route path="/attendance/attendance-daily/employee/:employeeId" element={<AttendanceDailyPage />} />
          </Route>

          {/* ── ADMIN + HR ───────────────────────────────────────────────── */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'HR']} redirectTo="/hrm/employee-portal" />}>
            <Route path="/hrm/employees" element={<EmployeesPage />} />
            <Route path="/hrm/departments" element={<DepartmentsPage />} />
            <Route path="/attendance/shift-templates" element={<ShiftTemplatesPage />} />
            <Route path="/attendance/attendance-email" element={<AttendanceEmailPage />} />
            <Route path="/admin/audit-log" element={<AuditLogPage />} />
            <Route path="/admin/data-exports" element={<DataExportsPage />} />
          </Route>

          {/* ── SYSTEM ADMIN ONLY ────────────────────────────────────────── */}
          <Route element={<RoleRoute allowedRoles={['ADMIN']} redirectTo="/hrm/employee-portal" />}>
            <Route path="/admin/account-management" element={<AccountManagementPage />} />
            <Route path="/admin/role-management" element={<RoleManagementPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
            <Route path="/admin/profile" element={<ProfilePage />} />
            <Route path="/admin/batch-processing" element={<BatchProcessingPage />} />
          </Route>

          {/* Error Pages */}
          <Route path="/500" element={<ServerErrorPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  </Suspense>
);

export default AppRouter;
