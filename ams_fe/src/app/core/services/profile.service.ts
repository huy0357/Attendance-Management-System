import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { ProfileRecord, UpdateProfileRequest } from '../../shared/models/profile.model';

interface ProfileApiResponse {
  accountId: number;
  employeeId: number;
  employeeCode: string | null;
  username: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  dob: string | null;
  roleId: number | null;
  roleCode: string | null;
  isActive: boolean;
  status: string | null;
  departmentId: number | null;
  positionId: number | null;
  managerId: number | null;
  hireDate: string | null;
  terminatedDate: string | null;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly profileUrl = `${environment.apiBaseUrl}/v1/profile`;
  private readonly allowedAvatarTypes = new Set(['image/jpeg', 'image/png', 'image/jpg', 'image/webp']);

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
  ) {}

  getMyProfile(): Observable<ProfileRecord> {
    return this.http.get<ProfileApiResponse>(`${this.profileUrl}/me`).pipe(
      map((profile) => this.mapProfile(profile)),
    );
  }

  updateMyProfile(request: UpdateProfileRequest): Observable<ProfileRecord> {
    return this.http.put<ProfileApiResponse>(`${this.profileUrl}/me`, this.cleanPayload(request)).pipe(
      map((profile) => this.mapProfile(profile)),
    );
  }

  uploadMyAvatar(file: File): Observable<ProfileRecord> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ProfileApiResponse>(`${this.profileUrl}/avatar`, formData).pipe(
      map((profile) => this.mapProfile(profile)),
    );
  }

  resolveEmployeeIdFromAuthContext(): Observable<number> {
    const employeeIdFromToken = this.authService.getEmployeeId();
    if (employeeIdFromToken) {
      return of(employeeIdFromToken);
    }

    return this.getMyProfile().pipe(
      map((profile) => {
        const employeeId = Number(profile.employeeId);
        if (!Number.isInteger(employeeId) || employeeId <= 0) {
          throw new Error('Missing employeeId in profile context.');
        }
        return employeeId;
      }),
    );
  }

  isAllowedAvatarType(file: File): boolean {
    return this.allowedAvatarTypes.has(file.type);
  }

  getAllowedAvatarTypesLabel(): string {
    return 'jpg, jpeg, png, webp';
  }

  private mapProfile(profile: ProfileApiResponse): ProfileRecord {
    return {
      accountId: profile.accountId,
      employeeId: profile.employeeId,
      employeeCode: profile.employeeCode ?? null,
      username: profile.username ?? null,
      fullName: profile.fullName ?? null,
      email: profile.email ?? null,
      phone: profile.phone ?? null,
      gender: profile.gender ?? null,
      dob: profile.dob ?? null,
      roleId: profile.roleId ?? null,
      roleCode: profile.roleCode ?? null,
      isActive: Boolean(profile.isActive),
      status: profile.status ?? null,
      departmentId: profile.departmentId ?? null,
      positionId: profile.positionId ?? null,
      managerId: profile.managerId ?? null,
      hireDate: profile.hireDate ?? null,
      terminatedDate: profile.terminatedDate ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      lastLoginAt: profile.lastLoginAt ?? null,
      createdAt: profile.createdAt ?? null,
      updatedAt: profile.updatedAt ?? null,
      message: profile.message,
      avatarLabel: this.toInitials(profile.fullName ?? profile.username ?? 'U'),
    };
  }

  private toInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  private cleanPayload<T extends object>(payload: T): Partial<T> {
    const cleaned: Partial<T> = {};

    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (value !== undefined) {
        (cleaned as Record<string, unknown>)[key] = value;
      }
    }

    return cleaned;
  }
}
