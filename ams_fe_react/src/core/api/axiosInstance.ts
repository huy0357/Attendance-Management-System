import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

// ── Storage keys (identical to Angular AuthService) ──────────────────────────
const KEYS = {
  accessToken: 'ams.accessToken',
  refreshToken: 'ams.refreshToken',
  username: 'ams.username',
  role: 'ams.role',
  expiresAt: 'ams.expiresAt',
} as const;

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(KEYS.accessToken),
  getRefreshToken: () => localStorage.getItem(KEYS.refreshToken),
  getUsername: () => localStorage.getItem(KEYS.username),
  getRole: () => localStorage.getItem(KEYS.role),
  getExpiresAt: (): number | null => {
    const raw = localStorage.getItem(KEYS.expiresAt);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  },
  store: (data: {
    accessToken: string;
    refreshToken: string;
    username: string;
    role: string;
    expiresInSeconds: number;
  }) => {
    localStorage.setItem(KEYS.accessToken, data.accessToken);
    localStorage.setItem(KEYS.refreshToken, data.refreshToken);
    localStorage.setItem(KEYS.username, data.username);
    localStorage.setItem(KEYS.role, data.role);
    const expiresAt = Date.now() + (data.expiresInSeconds ?? 0) * 1000;
    if (data.expiresInSeconds > 0) {
      localStorage.setItem(KEYS.expiresAt, String(expiresAt));
    }
  },
  clear: () => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};

// ── Axios instance ────────────────────────────────────────────────────────────
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

const isAuthEndpoint = (url?: string) => Boolean(url?.includes('/auth/'));

// ── Request interceptor: attach Bearer token ──────────────────────────────────
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (isAuthEndpoint(config.url)) return config;
  const token = tokenStorage.getAccessToken();
  if (token) {
    if (!config.headers) {
      config.headers = new axios.AxiosHeaders();
    }
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// ── Response interceptor: handle 401 & token refresh ─────────────────────────
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errorCode?: string;
  timestamp: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  username: string;
  role: string;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    if (originalRequest) {
      const isNetworkError = !error.response;
      const isTimeout = error.code === 'ECONNABORTED';
      const isServerError = error.response && error.response.status >= 500;

      // CHỈ retry khi gặp lỗi Network Error, Timeout (ECONNABORTED) hoặc status >= 500
      // TUYỆT ĐỐI KHÔNG retry lỗi 4xx
      if (isNetworkError || isTimeout || isServerError) {
        originalRequest._retryCount = originalRequest._retryCount || 0;
        if (originalRequest._retryCount < 2) {
          originalRequest._retryCount++;
          const delay = originalRequest._retryCount === 1 ? 1000 : 2000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return axiosInstance(originalRequest);
        }
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint(originalRequest.url)) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<ApiResponse<AuthResponse>>(
          `${BASE_URL}/auth/refresh`,
          { refreshToken },
        );
        const authData = data.data;
        tokenStorage.store(authData);
        originalRequest.headers.Authorization = `Bearer ${authData.accessToken}`;
        onRefreshed(authData.accessToken);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Only clear state and redirect if the refresh token ITSELF fails
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 403 Forbidden: Phát event toàn cục để hiển thị Toast thân thiện ────
    if (error.response?.status === 403) {
      window.dispatchEvent(
        new CustomEvent('ams:forbidden', {
          detail: { message: 'Bạn không có quyền thực hiện thao tác này.' },
        }),
      );
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
