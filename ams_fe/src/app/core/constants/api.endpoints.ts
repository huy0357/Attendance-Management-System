/**
 * API endpoints – paths relative to baseUrl (http://localhost:8080/api).
 * Full URL = baseUrl + endpoint
 *
 * Backend endpoints:
 * - http://localhost:8080/api/auth/login
 * - http://localhost:8080/api/auth/logout
 * - http://localhost:8080/api/auth/refresh
 * - http://localhost:8080/api/employees
 * - http://localhost:8080/api/auth/accounts
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ACCOUNTS: '/auth/accounts',
  },
  EMPLOYEES: '/employees',
} as const;
