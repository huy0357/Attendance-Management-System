import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly accessTokenKey = 'ams.accessToken';
  private readonly refreshTokenKey = 'ams.refreshToken';
  private readonly usernameKey = 'ams.username';
  private readonly roleKey = 'ams.role';
  private readonly expiresAtKey = 'ams.expiresAt';
  private readonly refreshLeewayMs = 60_000;
  private refreshInFlight$: Observable<AuthResponse> | null = null;
  private refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(private http: HttpClient) {
    this.scheduleRefresh();
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, request)
      .pipe(tap(response => this.storeTokens(response)));
  }

  refreshTokens(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Missing refresh token'));
    }

    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http
        .post<AuthResponse>(`${environment.apiBaseUrl}/auth/refresh`, { refreshToken })
        .pipe(
          tap(response => this.storeTokens(response)),
          shareReplay(1),
          finalize(() => {
            this.refreshInFlight$ = null;
          }),
        );
    }

    return this.refreshInFlight$;
  }

  logout(): Observable<void> {
    const refreshToken = this.getRefreshToken();
    this.clearTokens();
    if (!refreshToken) {
      return new Observable<void>(observer => {
        observer.next();
        observer.complete();
      });
    }

    return this.http.post<void>(`${environment.apiBaseUrl}/auth/logout`, { refreshToken });
  }

  isAuthenticated(): boolean {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      return false;
    }

    return !this.isAccessTokenExpired();
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  getUsername(): string | null {
    return localStorage.getItem(this.usernameKey);
  }

  getRole(): string | null {
    return localStorage.getItem(this.roleKey);
  }

  getExpiresAt(): number | null {
    const raw = localStorage.getItem(this.expiresAtKey);
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  isAccessTokenExpired(leewayMs = 0): boolean {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      return true;
    }

    const expiresAt = this.getExpiresAt() ?? this.extractExpiresAt(accessToken);
    if (!expiresAt) {
      return false;
    }

    return Date.now() + leewayMs >= expiresAt;
  }

  isAuthEndpoint(url: string): boolean {
    return url.includes('/api/auth/');
  }

  private storeTokens(response: AuthResponse): void {
    localStorage.setItem(this.accessTokenKey, response.accessToken);
    localStorage.setItem(this.refreshTokenKey, response.refreshToken);
    localStorage.setItem(this.usernameKey, response.username);
    localStorage.setItem(this.roleKey, response.role);
    const expiresAt = Date.now() + (response.expiresInSeconds ?? 0) * 1000;
    if (response.expiresInSeconds && response.expiresInSeconds > 0) {
      localStorage.setItem(this.expiresAtKey, String(expiresAt));
    } else {
      const jwtExpiresAt = this.extractExpiresAt(response.accessToken);
      if (jwtExpiresAt) {
        localStorage.setItem(this.expiresAtKey, String(jwtExpiresAt));
      } else {
        localStorage.removeItem(this.expiresAtKey);
      }
    }

    this.scheduleRefresh();
  }

  clearTokens(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.usernameKey);
    localStorage.removeItem(this.roleKey);
    localStorage.removeItem(this.expiresAtKey);
    this.clearRefreshTimer();
  }

  private scheduleRefresh(): void {
    this.clearRefreshTimer();

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return;
    }

    const expiresAt = this.getExpiresAt() ?? this.extractExpiresAt(this.getAccessToken() ?? '');
    if (!expiresAt) {
      return;
    }

    const refreshAt = expiresAt - this.refreshLeewayMs;
    const delayMs = Math.max(refreshAt - Date.now(), 1000);
    this.refreshTimeoutId = setTimeout(() => {
      this.refreshTokens().subscribe({
        error: () => {
          this.clearTokens();
        },
      });
    }, delayMs);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
      this.refreshTimeoutId = null;
    }
  }

  private extractExpiresAt(token: string): number | null {
    const payload = this.decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') {
      return null;
    }

    return payload.exp * 1000;
  }

  private decodeJwtPayload(token: string): { exp?: number } | null {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');

    try {
      const json = atob(padded);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
