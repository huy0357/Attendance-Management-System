import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
  selectedEmployeeId: number | null = null;

  isSearchingEmployees = false;
  isSendingOne = false;
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
      this.searchEmployees();
    }
  }

  searchEmployees(page: number = 1): void {
    if (!this.canSelectAttendanceEmailRecipient) {
      this.employees = [];
      this.selectedEmployeeId = null;
      return;
    }

    this.isSearchingEmployees = true;
    this.errorMessage = '';
    this.employeeSearchPage = page;

    this.attendanceService.searchAttendanceEmailEmployees(
      this.employeeQuery.trim(),
      this.employeeSearchPage,
      this.employeeSearchPageSize,
    ).subscribe({
      next: (response) => {
        this.employees = response.items ?? [];
        this.employeeSearchTotalItems = response.totalItems ?? 0;
        this.employeeSearchTotalPages = response.totalPages || Math.ceil(this.employeeSearchTotalItems / this.employeeSearchPageSize) || 1;
        if (!this.employees.some(employee => employee.employeeId === this.selectedEmployeeId)) {
          this.selectedEmployeeId = this.employees[0]?.employeeId ?? null;
        }
        this.isSearchingEmployees = false;
      },
      error: (error: HttpErrorResponse) => {
        this.employees = [];
        this.selectedEmployeeId = null;
        this.employeeSearchTotalItems = 0;
        this.employeeSearchTotalPages = 0;
        this.isSearchingEmployees = false;
        this.errorMessage = this.extractErrorMessage(error, 'Unable to load employees for attendance email.');
      },
    });
  }

  onEmployeeSearch(): void {
    if (!this.canSelectAttendanceEmailRecipient) {
      return;
    }
    this.searchEmployees(1);
  }

  selectEmployee(employeeId: number): void {
    this.selectedEmployeeId = employeeId;
  }

  sendToSelectedEmployee(): void {
    if (!this.canSelectAttendanceEmailRecipient) {
      this.errorMessage = 'Single-recipient attendance email is hidden because backend employee lookup is not available for your role.';
      this.successMessage = '';
      return;
    }

    const normalizedMonth = this.normalizeMonth(this.month);
    if (!normalizedMonth) {
      this.errorMessage = 'Month must use yyyy-MM format.';
      this.successMessage = '';
      return;
    }

    if (!this.selectedEmployeeId) {
      this.errorMessage = 'Employee is required for sending to one employee.';
      this.successMessage = '';
      return;
    }

    this.isSendingOne = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.attendanceService.sendAttendanceEmail(normalizedMonth, this.selectedEmployeeId, this.regenerate).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.isSendingOne = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(error, 'Unable to send attendance email.');
        this.isSendingOne = false;
      },
    });
  }

  sendToAllEmployees(): void {
    const normalizedMonth = this.normalizeMonth(this.month);
    if (!normalizedMonth) {
      this.errorMessage = 'Month must use yyyy-MM format.';
      this.successMessage = '';
      return;
    }

    this.isSendingAll = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.attendanceService.sendAttendanceEmailToAll(normalizedMonth, this.regenerate).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.isSendingAll = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(error, 'Unable to send attendance email to all employees.');
        this.isSendingAll = false;
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

  private normalizeMonth(value: string): string | null {
    const normalized = String(value ?? '').trim();
    return /^\d{4}-\d{2}$/.test(normalized) ? normalized : null;
  }
}
