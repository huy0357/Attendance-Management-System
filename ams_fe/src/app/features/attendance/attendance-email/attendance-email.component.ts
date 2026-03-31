import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { AttendanceEmailEmployee, AttendanceService } from '../attendance.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  standalone: false,
  selector: 'app-attendance-email',
  templateUrl: './attendance-email.component.html',
  styleUrls: ['./attendance-email.component.scss'],
})
export class AttendanceEmailComponent implements OnInit {
  month = this.formatMonthInput(new Date());
  regenerate = false;
  employeeQuery = '';

  employees: AttendanceEmailEmployee[] = [];
  sendingEmployeeId: number | null = null;

  isSearchingEmployees = false;
  isSendingAll = false;

  successMessage = '';
  errorMessage = '';

  employeeSearchPage = 1;
  employeeSearchPageSize = 10;
  employeeSearchTotalItems = 0;
  employeeSearchTotalPages = 0;

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  get canManageAttendanceEmails(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'HR', 'MANAGER']);
  }

  get canSelectAttendanceEmailRecipient(): boolean {
    return this.authService.hasRole('ADMIN');
  }

  get canSendAttendanceEmailToAll(): boolean {
    return this.canManageAttendanceEmails;
  }

  ngOnInit(): void {
    if (this.canSelectAttendanceEmailRecipient) {
      this.searchEmployees(1);
    }
  }

  searchEmployees(page: number = 1): void {
    if (!this.canSelectAttendanceEmailRecipient) {
      this.employees = [];
      return;
    }

    this.isSearchingEmployees = true;
    this.errorMessage = '';
    this.employeeSearchPage = page;
    this.cdr.detectChanges();

    this.attendanceService.searchAttendanceEmailEmployees(
      this.employeeQuery.trim(),
      this.employeeSearchPage,
      this.employeeSearchPageSize,
    ).pipe(
      finalize(() => {
        this.isSearchingEmployees = false;
        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: (response) => {
        // response is PageResponse<AttendanceEmailEmployee> → items field
        const rawItems = response?.items;
        this.employees = Array.isArray(rawItems) ? rawItems : [];
        this.employeeSearchTotalItems = response?.totalItems ?? 0;
        this.employeeSearchTotalPages =
          response?.totalPages ||
          Math.ceil(this.employeeSearchTotalItems / this.employeeSearchPageSize) ||
          1;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.employees = [];
        this.employeeSearchTotalItems = 0;
        this.employeeSearchTotalPages = 0;
        this.errorMessage = this.extractErrorMessage(error, 'Unable to load employees.');
        this.cdr.detectChanges();
      },
    });
  }

  onEmployeeSearch(): void {
    if (!this.canSelectAttendanceEmailRecipient) {
      return;
    }
    this.searchEmployees(1);
  }

  sendToEmployee(employee: AttendanceEmailEmployee): void {
    const normalizedMonth = this.normalizeMonthForApi(this.month);
    if (!normalizedMonth) {
      this.errorMessage = 'Please select a valid month (yyyy-MM format).';
      this.successMessage = '';
      this.cdr.detectChanges();
      return;
    }

    const employeeId = this.resolveEmployeeId(employee);
    if (employeeId === null) {
      this.errorMessage = 'Invalid employee identifier. Please refresh and try again.';
      this.successMessage = '';
      this.cdr.detectChanges();
      return;
    }

    this.sendingEmployeeId = employeeId;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.attendanceService.sendAttendanceEmail(normalizedMonth, employeeId, this.regenerate).pipe(
      finalize(() => {
        this.sendingEmployeeId = null;
        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: (response) => {
        this.successMessage = response?.message || `Email sent to ${employee.fullName} successfully.`;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(error, `Unable to send email to ${employee.fullName}.`);
        this.cdr.detectChanges();
      },
    });
  }

  sendToAllEmployees(): void {
    const normalizedMonth = this.normalizeMonthForApi(this.month);
    if (!normalizedMonth) {
      this.errorMessage = 'Please select a valid month (yyyy-MM format).';
      this.successMessage = '';
      this.cdr.detectChanges();
      return;
    }

    this.isSendingAll = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.attendanceService.sendAttendanceEmailToAll(normalizedMonth, this.regenerate).pipe(
      finalize(() => {
        this.isSendingAll = false;
        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: (response) => {
        this.successMessage = response?.message || 'Emails sent to all employees successfully.';
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(error, 'Unable to send attendance emails to all employees.');
        this.cdr.detectChanges();
      },
    });
  }

  prevEmployeePage(): void {
    if (this.employeeSearchPage <= 1 || this.isSearchingEmployees) {
      return;
    }
    this.searchEmployees(this.employeeSearchPage - 1);
  }

  nextEmployeePage(): void {
    if (this.employeeSearchPage >= this.employeeSearchTotalPages || this.isSearchingEmployees) {
      return;
    }
    this.searchEmployees(this.employeeSearchPage + 1);
  }

  dismissMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const backendMessage = error.error?.message || error.error?.error;
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
    return fallback;
  }

  private formatMonthInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  private normalizeMonthForApi(value: string): string | null {
    const normalized = String(value ?? '').trim();

    // Accept native month input (yyyy-MM) directly.
    if (/^\d{4}-\d{2}$/.test(normalized)) {
      return normalized;
    }

    // Fallback for accidental full date/datetime values (yyyy-MM-dd or ISO string).
    const isoLikeMatch = normalized.match(/^(\d{4})-(\d{2})-\d{2}(?:[T\s].*)?$/);
    if (isoLikeMatch) {
      return `${isoLikeMatch[1]}-${isoLikeMatch[2]}`;
    }

    return null;
  }

  private resolveEmployeeId(employee: Partial<AttendanceEmailEmployee> & { id?: unknown }): number | null {
    const rawId = employee?.employeeId ?? employee?.id;
    const parsedId = Number(rawId);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      return null;
    }
    return parsedId;
  }
}
