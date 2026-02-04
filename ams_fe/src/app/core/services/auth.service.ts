import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { AuthResponse, User, UserRole } from '../models/user.model';
import { API_ENDPOINTS } from '../constants/api.endpoints';

export interface LoginRequest {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private apiService: ApiService,
    private storageService: StorageService,
    private router: Router
  ) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.apiService.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials).pipe(
      tap((response) => {
        this.storageService.setAccessToken(response.accessToken);
        this.storageService.setRefreshToken(response.refreshToken);
        // Map response to User object
        const user: User = {
          username: response.username,
          role: this.mapRoleToEnum(response.role),
        };
        this.storageService.setUser(user);
      })
    );
  }

  logout(): void {
    const refreshToken = this.storageService.getRefreshToken();
    // Clear local state and navigate immediately to avoid blocking on API
    this.storageService.clear();
    this.router.navigate(['/auth/login']);

    if (refreshToken) {
      // Call logout API
      this.apiService.post(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken }).subscribe({
        next: () => {},
        error: () => {},
      });
    }
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.storageService.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    return this.apiService.post<AuthResponse>(API_ENDPOINTS.AUTH.REFRESH, { refreshToken }).pipe(
      tap((response) => {
        this.storageService.setAccessToken(response.accessToken);
        this.storageService.setRefreshToken(response.refreshToken);
        const user: User = {
          username: response.username,
          role: this.mapRoleToEnum(response.role),
        };
        this.storageService.setUser(user);
      })
    );
  }

  getCurrentUser(): User | null {
    return this.storageService.getUser<User>();
  }

  isAuthenticated(): boolean {
    return !!this.storageService.getAccessToken();
  }

  private mapRoleToEnum(role: string): UserRole {
    const lowerRole = role?.toLowerCase() ?? '';
    switch (lowerRole) {
      case 'admin':
        return UserRole.ADMIN;
      case 'hr':
        return UserRole.HR;
      case 'manager':
        return UserRole.MANAGER;
      case 'employee':
      default:
        return UserRole.EMPLOYEE;
    }
  }
}
