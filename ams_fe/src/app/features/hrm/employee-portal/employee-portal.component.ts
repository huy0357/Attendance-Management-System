import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ProfileService } from '../../../core/services/profile.service';
import { ProfileRecord } from '../../../shared/models/profile.model';

@Component({
  standalone: false,
  selector: 'app-employee-portal',
  templateUrl: './employee-portal.component.html',
  styleUrls: ['./employee-portal.component.scss'],
})
export class EmployeePortalComponent implements OnInit {
  employee: ProfileRecord | null = null;
  isLoadingProfile = true;
  profileErrorMessage = '';
  avatarImageFailed = false;

  constructor(
    private readonly profileService: ProfileService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  formatDateTime(value: string | null): string {
    if (!value) {
      return '-';
    }
    return new Date(value).toLocaleString();
  }

  formatText(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
  }

  get shouldShowAvatarImage(): boolean {
    return Boolean(this.employee?.avatarUrl) && !this.avatarImageFailed;
  }

  get employeeDisplayName(): string {
    return this.employee?.fullName || this.employee?.username || 'Employee';
  }

  get employeeAvatarText(): string {
    const provided = (this.employee?.avatarLabel || '').trim();
    if (provided) {
      return provided.slice(0, 2).toUpperCase();
    }

    return this.employeeDisplayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'EM';
  }

  onAvatarError(): void {
    this.avatarImageFailed = true;
  }

  private loadProfile(): void {
    this.isLoadingProfile = true;
    this.profileErrorMessage = '';
    this.avatarImageFailed = false;

    this.profileService.getMyProfile()
      .pipe(finalize(() => {
        this.isLoadingProfile = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
      next: (employee) => {
        this.employee = employee;
      },
      error: (error: HttpErrorResponse) => {
        this.employee = null;
        this.profileErrorMessage = this.resolveProfileError(error);
      },
    });
  }

  private resolveProfileError(error: HttpErrorResponse): string {
    if (error.status === 401) {
      return 'Your session is no longer valid. Please sign in again to load your profile.';
    }

    if (error.status === 403) {
      return 'You do not have permission to view this self-service profile.';
    }

    const backendMessage = error.error?.message || error.error?.error;
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }

    return 'Unable to load your profile right now. Please try again later.';
  }
}
