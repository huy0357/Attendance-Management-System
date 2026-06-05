/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                        SECURE API ENTRY POINT                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  This is the ONLY authorized import for making authenticated API calls.    ║
 * ║                                                                            ║
 * ║  RULES (enforced by architecture — do NOT bypass):                         ║
 * ║                                                                            ║
 * ║  ✅  Import `secureApi` from this file for all authenticated requests.     ║
 * ║  ✅  The Authorization header is injected automatically by the interceptor. ║
 * ║  ✅  The refresh token is handled by the browser cookie jar automatically. ║
 * ║                                                                            ║
 * ║  🚫  NEVER use raw `fetch()` for authenticated requests.                   ║
 * ║  🚫  NEVER create a second `axios.create()` instance for auth calls.       ║
 * ║  🚫  NEVER read tokens from memory/storage to attach them manually.        ║
 * ║  🚫  NEVER store tokens in localStorage or sessionStorage.                 ║
 * ║                                                                            ║
 * ║  If you believe you need to break these rules, consult the security lead   ║
 * ║  and the AuthContext before making any changes.                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * @example
 * import { secureApi } from '@/core/api/secureApi';
 *
 * // GET
 * const { data } = await secureApi.get<ApiResponse<Employee[]>>('/employees');
 *
 * // POST
 * const { data } = await secureApi.post<ApiResponse<void>>('/employees', payload);
 *
 * // Cookies (refresh token) and Authorization (access token) are handled
 * // automatically — you never touch a token directly.
 */

export { default as secureApi } from './axiosInstance';
export { tokenMemory } from './axiosInstance';
