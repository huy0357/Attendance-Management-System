/**
 * API endpoints – paths relative to baseUrl (/api).
 * Full URL = baseUrl + endpoint
 *
 * Backend endpoints (phải khớp với @RequestMapping trong ams_be):
 * - Auth: /api/auth/login, /api/auth/logout, /api/auth/refresh
 * - Accounts: /api/accounts (AccountController)
 * - Employees: /api/employees, /api/employees/page, /api/employees/search
 * - Departments: /api/departments, /api/departments/tree
 */
const AUTH_BASE = '/auth';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${AUTH_BASE}/login`,
    LOGOUT: `${AUTH_BASE}/logout`,
    REFRESH: `${AUTH_BASE}/refresh`,
  },
  ACCOUNTS: '/accounts',
  EMPLOYEES: '/employees',
  EMPLOYEES_PAGE: '/employees/page',
  EMPLOYEES_SEARCH: '/employees/search',
  DEPARTMENTS: '/departments',
  DEPARTMENTS_TREE: '/departments/tree',
} as const;
