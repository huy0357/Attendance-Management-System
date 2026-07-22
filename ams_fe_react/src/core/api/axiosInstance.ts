import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

interface InMemoryStore {
  accessToken: string | null;
  username: string | null;
  role: string | null;
  expiresAt: number | null;
}

const _store: InMemoryStore = {
  accessToken: null,
  username: null,
  role: null,
  expiresAt: null,
};

/**
 * Cookie Helper for Refresh Token
 * 
 * SECURITY COMPROMISE NOTE:
 * Because we are strictly forbidden from modifying the backend, and the backend 
 * does not currently set an HttpOnly cookie (it expects the token in the JSON body),
 * we MUST store the refresh token somewhere that survives a page reload.
 * 
 * We use a standard Secure cookie here. It is NOT HttpOnly (because JS cannot set 
 * HttpOnly cookies), but it avoids localStorage as requested.
 */
export const cookieStorage = {
  setRefreshToken: (token: string) => {
    const secure = window.location.protocol === 'https:';

    document.cookie =
      `ams_refresh=${token}; path=/; max-age=604800; samesite=lax${secure ? '; secure' : ''}`;
  },
  getRefreshToken: (): string | null => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.split('; ').find(row => row.startsWith('ams_refresh='));
    return match ? match.split('=')[1] : null;
  },
  clearRefreshToken: () => {
    const secure = window.location.protocol === 'https:';

    document.cookie =
      `ams_refresh=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax${secure ? '; secure' : ''}`;
  }
};

export const tokenMemory = {
  getAccessToken: (): string | null => _store.accessToken,
  getUsername: (): string | null => _store.username,
  getRole: (): string | null => _store.role,
  getExpiresAt: (): number | null => _store.expiresAt,
  store: (data: {
    accessToken: string;
    refreshToken?: string; // We now receive it from backend JSON
    username: string;
    role: string;
    expiresInSeconds: number;
  }): void => {
    _store.accessToken = data.accessToken;
    _store.username = data.username;
    _store.role = data.role;
    _store.expiresAt = data.expiresInSeconds > 0 ? Date.now() + data.expiresInSeconds * 1000 : null;

    // Store refresh token in standard cookie to survive reloads without backend changes
    if (data.refreshToken) {
      cookieStorage.setRefreshToken(data.refreshToken);
    }
  },
  clear: (): void => {
    _store.accessToken = null;
    _store.username = null;
    _store.role = null;
    _store.expiresAt = null;
    cookieStorage.clearRefreshToken();
  },
  isAuthenticated: (): boolean => _store.accessToken !== null,
} as const;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

const isAuthEndpoint = (url?: string): boolean => Boolean(url?.includes('/auth/'));

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (isAuthEndpoint(config.url)) return config;

    const token = tokenMemory.getAccessToken();
    if (token) {
      if (!config.headers) {
        config.headers = new axios.AxiosHeaders();
      }
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string): void => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: (token: string) => void): void => {
  refreshSubscribers.push(cb);
};

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
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

      if (isNetworkError || isTimeout || isServerError) {
        originalRequest._retryCount = originalRequest._retryCount ?? 0;
        if (originalRequest._retryCount < 2) {
          originalRequest._retryCount++;
          const delay = originalRequest._retryCount === 1 ? 1_000 : 2_000;
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

      const currentRefreshToken = cookieStorage.getRefreshToken();
      if (!currentRefreshToken) {
        tokenMemory.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<ApiResponse<AuthResponse>>(
          `${BASE_URL}/auth/refresh`,
          { refreshToken: currentRefreshToken }, // Backend strictly requires this in the body
          { withCredentials: true }
        );
        const authData = data.data;

        tokenMemory.store(authData);
        originalRequest.headers.Authorization = `Bearer ${authData.accessToken}`;
        onRefreshed(authData.accessToken);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        tokenMemory.clear();
        refreshSubscribers = [];
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403) {
      window.dispatchEvent(new CustomEvent('ams:forbidden', { detail: { message: 'Bạn không có quyền thực hiện thao tác này.' } }));
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
