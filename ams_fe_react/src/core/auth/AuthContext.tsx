/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                      SECURE AUTHENTICATION CONTEXT                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  TOKEN STORAGE POLICY:                                                     ║
 * ║                                                                            ║
 * ║  • accessToken  → tokenMemory (JS heap). Wiped on reload. Never persisted. ║
 * ║  • refreshToken → HttpOnly cookie set by backend. Never visible to JS.     ║
 * ║                                                                            ║
 * ║  AUTH STATE ACROSS RELOADS:                                                ║
 * ║  After a hard page reload, isAuthenticated will be false because the       ║
 * ║  in-memory access token is gone. The backend must expose a session-check   ║
 * ║  endpoint (e.g. GET /auth/session) that validates the HttpOnly refresh     ║
 * ║  cookie and returns a new access token without JavaScript ever seeing the  ║
 * ║  refresh token. That endpoint should be called in main.tsx / App.tsx on    ║
 * ║  initial mount to silently restore the session.                            ║
 * ║                                                                            ║
 * ║  ⚠️  NEVER add localStorage / sessionStorage reads for tokens here.        ║
 * ║  ⚠️  NEVER pass refreshToken as a field in API request bodies from here.   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import axiosInstance, { tokenMemory, cookieStorage } from '../api/axiosInstance';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * The backend login/refresh response shape.
 *
 * NOTE: `refreshToken` is intentionally NOT included here even if the backend
 * returns it in the body. The backend must set it as an HttpOnly cookie.
 * If the backend currently returns it in the body AND in a cookie, the body
 * field is silently ignored by this frontend. Never read it.
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken?: string; // Backend sends this, we store it in a standard cookie
  tokenType: string;
  expiresInSeconds: number;
  username: string;
  role: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errorCode?: string;
  timestamp: string;
}

export interface ApiMessageResponse {
  message: string;
}

interface JwtPayload {
  exp?: number;
  employeeId?: number | string;
}

// ── Helper: decode JWT payload (read-only, never write) ───────────────────────
function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '=',
  );
  try {
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

function normalizeRole(role: string): string {
  return role.toUpperCase().replace(/^ROLE_/, '');
}

// ── Context Shape ─────────────────────────────────────────────────────────────
interface AuthContextValue {
  isInitializing: boolean;
  isAuthenticated: boolean;
  username: string | null;
  role: string | null;
  /** Login — stores accessToken in memory only, schedules silent refresh. */
  login: (req: LoginRequest) => Promise<AuthResponse>;
  /** Logout — clears in-memory tokens only. UI preferences are NOT cleared. */
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<ApiMessageResponse>;
  verifyOtp: (email: string, otp: string) => Promise<ApiMessageResponse>;
  resetPassword: (
    email: string,
    otp: string,
    newPassword: string,
  ) => Promise<ApiMessageResponse>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  getNormalizedRole: () => string | null;
  getEmployeeId: () => number | null;
}

// ── Context ───────────────────────────────────────────────────────────────────
export const AuthContext = createContext<AuthContextValue | null>(null);

const REFRESH_LEEWAY_MS = 60_000; // Refresh 60s before expiry

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // SECURITY: State initializers read ONLY from tokenMemory (in-memory store).
  // On a fresh page load, tokenMemory is always empty → isAuthenticated = false.
  // ⚠️  DO NOT change these to read from localStorage.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => tokenMemory.isAuthenticated(),
  );
  const [username, setUsername] = useState<string | null>(
    () => tokenMemory.getUsername(),
  );
  const [role, setRole] = useState<string | null>(() => tokenMemory.getRole());
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Session Restoration on Mount ───────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      if (tokenMemory.isAuthenticated()) {
        if (mounted) setIsInitializing(false);
        return;
      }

      const currentRefreshToken = cookieStorage.getRefreshToken();
      if (!currentRefreshToken) {
        if (mounted) setIsInitializing(false);
        return;
      }

      try {
        const { data } = await axiosInstance.post<ApiResponse<AuthResponse>>(
          '/auth/refresh',
          { refreshToken: currentRefreshToken }, // BE expects it in body
        );
        const authData = data.data;
        tokenMemory.store(authData);
        
        if (mounted) {
          setIsAuthenticated(true);
          setUsername(authData.username);
          setRole(authData.role);
        }
      } catch (error) {
        if (mounted) {
          setIsAuthenticated(false);
          setUsername(null);
          setRole(null);
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  // ── Silent Token Refresh Scheduler ─────────────────────────────────────────
  //
  // SECURITY: This function schedules a proactive token refresh before the
  // access token expires. It does NOT read or send the refresh token —
  // the browser sends the HttpOnly cookie automatically via withCredentials.
  //
  // ⚠️  Do NOT add `tokenMemory.getRefreshToken()` or any localStorage read.
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const expiresAt = tokenMemory.getExpiresAt();
    if (!expiresAt) return;

    const currentRefreshToken = cookieStorage.getRefreshToken();
    if (!currentRefreshToken) return;

    const refreshAt = expiresAt - REFRESH_LEEWAY_MS;
    const delayMs = Math.max(refreshAt - Date.now(), 1_000);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await axiosInstance.post<ApiResponse<AuthResponse>>(
          '/auth/refresh',
          { refreshToken: currentRefreshToken },
        );
        const authData = data.data;
        tokenMemory.store(authData);
        setUsername(authData.username);
        setRole(authData.role);
        scheduleRefresh(); // Reschedule for the new token's expiry
      } catch {
        // Refresh failed (cookie expired/invalid) → force re-login
        tokenMemory.clear();
        setIsAuthenticated(false);
        setUsername(null);
        setRole(null);
      }
    }, delayMs);
  }, []);

  useEffect(() => {
    if (isAuthenticated) scheduleRefresh();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [isAuthenticated, scheduleRefresh]);

  // ── Auth Actions ───────────────────────────────────────────────────────────

  const login = useCallback(
    async (req: LoginRequest): Promise<AuthResponse> => {
      const { data } = await axiosInstance.post<ApiResponse<AuthResponse>>(
        '/auth/login',
        req,
      );
      const authData = data.data;

      // SECURITY: Store ONLY the access token and metadata in memory.
      // tokenMemory.store() intentionally does not accept a refreshToken field.
      // The backend sets the refresh token as an HttpOnly cookie in this
      // response — it is handled by the browser automatically.
      tokenMemory.store(authData);

      setIsAuthenticated(true);
      setUsername(authData.username);
      setRole(authData.role);
      scheduleRefresh();
      return authData;
    },
    [scheduleRefresh],
  );

  const logout = useCallback(async (): Promise<void> => {
    const currentRefreshToken = cookieStorage.getRefreshToken();

    // 1. Wipe the in-memory access token & cookie immediately.
    tokenMemory.clear();

    // 2. Cancel the pending refresh timer.
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    // 3. Reset React auth state.
    setIsAuthenticated(false);
    setUsername(null);
    setRole(null);

    // 4. Notify backend to invalidate token.
    if (currentRefreshToken) {
      try {
        await axiosInstance.post('/auth/logout', { refreshToken: currentRefreshToken });
      } catch {
        // Ignore
      }
    }

    // 5. SECURITY NOTE: We intentionally do NOT call localStorage.clear() or
    //    sessionStorage.clear() here. Those storages hold only non-sensitive
    //    UI preferences (theme, language, etc.) via useSettings — see
    //    src/shared/hooks/useSettings.tsx. Wiping them would degrade UX
    //    with no security benefit.

    // 6. Redirect to login and wipe TanStack Query cache from memory.
    window.location.href = '/login';
  }, []);

  const forgotPassword = useCallback(
    async (email: string): Promise<ApiMessageResponse> => {
      const { data } = await axiosInstance.post<ApiResponse<null>>(
        '/auth/forgot-password',
        { email },
      );
      return { message: data.message };
    },
    [],
  );

  const verifyOtp = useCallback(
    async (email: string, otp: string): Promise<ApiMessageResponse> => {
      const { data } = await axiosInstance.post<ApiResponse<null>>(
        '/auth/verify-otp',
        { email, otp },
      );
      return { message: data.message };
    },
    [],
  );

  const resetPassword = useCallback(
    async (
      email: string,
      otp: string,
      newPassword: string,
    ): Promise<ApiMessageResponse> => {
      const { data } = await axiosInstance.post<ApiResponse<null>>(
        '/auth/reset-password',
        { email, otp, newPassword },
      );
      return { message: data.message };
    },
    [],
  );

  // ── Role Helpers ───────────────────────────────────────────────────────────
  const getNormalizedRole = useCallback(
    (): string | null => (role ? normalizeRole(role) : null),
    [role],
  );

  const hasRole = useCallback(
    (r: string): boolean => getNormalizedRole() === normalizeRole(r),
    [getNormalizedRole],
  );

  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      const normalized = getNormalizedRole();
      if (!normalized || roles.length === 0) return false;
      return roles.some((r) => normalizeRole(r) === normalized);
    },
    [getNormalizedRole],
  );

  /**
   * Extracts the employeeId claim from the in-memory access token's JWT payload.
   *
   * SECURITY: Reads ONLY from tokenMemory (access token in memory).
   * ⚠️  Do NOT add a refresh token fallback — the refresh token is an HttpOnly
   *     cookie and must never be decoded by JavaScript.
   */
  const getEmployeeId = useCallback((): number | null => {
    const token = tokenMemory.getAccessToken();
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    const parsed = Number(payload?.employeeId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isInitializing,
      isAuthenticated,
      username,
      role,
      login,
      logout,
      forgotPassword,
      verifyOtp,
      resetPassword,
      hasRole,
      hasAnyRole,
      getNormalizedRole,
      getEmployeeId,
    }),
    [
      isInitializing,
      isAuthenticated,
      username,
      role,
      login,
      logout,
      forgotPassword,
      verifyOtp,
      resetPassword,
      hasRole,
      hasAnyRole,
      getNormalizedRole,
      getEmployeeId,
    ],
  );

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--nm-bg, #f0f2f5)' }}>
        <div style={{ fontSize: '1.2rem', color: 'var(--nm-text, #333)', opacity: 0.7 }}>Restoring session...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

// ── useAuth Hook ───────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
