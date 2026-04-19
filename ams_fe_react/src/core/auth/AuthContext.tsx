import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import axiosInstance, { tokenStorage } from '../api/axiosInstance';

// ── Types (mirrors Angular auth.service.ts interfaces) ───────────────────────
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
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

// ── Helper: decode JWT payload ────────────────────────────────────────────────
function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  try {
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

function normalizeRole(role: string): string {
  return role.toUpperCase().replace(/^ROLE_/, '');
}

// ── Context shape ─────────────────────────────────────────────────────────────
interface AuthContextValue {
  isAuthenticated: boolean;
  username: string | null;
  role: string | null;
  /** Login — stores tokens, schedules refresh */
  login: (req: LoginRequest) => Promise<AuthResponse>;
  /** Logout — clears tokens, calls BE */
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

const REFRESH_LEEWAY_MS = 60_000;

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) return false;
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return true; // no exp claim → treat as valid
    return Date.now() < payload.exp * 1000;
  });

  const [username, setUsername] = useState<string | null>(() => tokenStorage.getUsername());
  const [role, setRole] = useState<string | null>(() => tokenStorage.getRole());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Schedule silent token refresh ─────────────────────────────────────────
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) return;

    const expiresAt = tokenStorage.getExpiresAt();
    if (!expiresAt) return;

    const refreshAt = expiresAt - REFRESH_LEEWAY_MS;
    const delayMs = Math.max(refreshAt - Date.now(), 1000);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await axiosInstance.post<ApiResponse<AuthResponse>>(
          '/auth/refresh',
          { refreshToken: tokenStorage.getRefreshToken() },
        );
        const authData = data.data;
        tokenStorage.store(authData);
        setUsername(authData.username);
        setRole(authData.role);
        scheduleRefresh();
      } catch {
        tokenStorage.clear();
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

  // ── Auth actions ───────────────────────────────────────────────────────────
  const login = useCallback(
    async (req: LoginRequest): Promise<AuthResponse> => {
      const { data } = await axiosInstance.post<ApiResponse<AuthResponse>>(
        '/auth/login',
        req,
      );
      const authData = data.data;
      tokenStorage.store(authData);
      setIsAuthenticated(true);
      setUsername(authData.username);
      setRole(authData.role);
      scheduleRefresh();
      return authData;
    },
    [scheduleRefresh],
  );

  const logout = useCallback(async (): Promise<void> => {
    const refreshToken = tokenStorage.getRefreshToken();
    
    // 1. Clear explicit token storage
    tokenStorage.clear();
    
    // 2. XÓA SẠCH STORAGE: Clear all memory in browser storages to prevent state contamination
    localStorage.clear();
    sessionStorage.clear();
    
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    
    // 3. RESET STATE TOÀN CỤC
    setIsAuthenticated(false);
    setUsername(null);
    setRole(null);
    
    if (refreshToken) {
      try {
        await axiosInstance.post('/auth/logout', { refreshToken });
      } catch {
        // Ignore — already cleared local state
      }
    }

    // 4. XÓA CACHE TẬN GỐC & RELOAD: 
    // Force a hard reload to completely wipe TanStack Query cache from memory
    window.location.href = '/login';
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<ApiMessageResponse> => {
    const { data } = await axiosInstance.post<ApiResponse<null>>('/auth/forgot-password', {
      email,
    });
    return { message: data.message };
  }, []);

  const verifyOtp = useCallback(
    async (email: string, otp: string): Promise<ApiMessageResponse> => {
      const { data } = await axiosInstance.post<ApiResponse<null>>('/auth/verify-otp', {
        email,
        otp,
      });
      return { message: data.message };
    },
    [],
  );

  const resetPassword = useCallback(
    async (email: string, otp: string, newPassword: string): Promise<ApiMessageResponse> => {
      const { data } = await axiosInstance.post<ApiResponse<null>>('/auth/reset-password', {
        email,
        otp,
        newPassword,
      });
      return { message: data.message };
    },
    [],
  );

  // ── Role helpers ───────────────────────────────────────────────────────────
  const getNormalizedRole = useCallback((): string | null => {
    return role ? normalizeRole(role) : null;
  }, [role]);

  const hasRole = useCallback(
    (r: string): boolean => {
      return getNormalizedRole() === normalizeRole(r);
    },
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

  const getEmployeeId = useCallback((): number | null => {
    const accessPayload = decodeJwtPayload(tokenStorage.getAccessToken() ?? '');
    const refreshPayload = decodeJwtPayload(tokenStorage.getRefreshToken() ?? '');
    const employeeId = accessPayload?.employeeId ?? refreshPayload?.employeeId;
    const parsed = Number(employeeId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ── useAuth hook ───────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
