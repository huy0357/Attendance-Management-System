import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AttendanceBatchResponse, AttendanceDailyResponse, AttendanceService } from '../attendance.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  standalone: false,
  selector: 'app-attendance-daily',
  templateUrl: './attendance-daily.component.html',
  styleUrls: ['./attendance-daily.component.scss'],
})
export class AttendanceDailyComponent implements OnInit {
  title = 'Attendance Daily';
  description = 'Review calculated attendance records for the selected date range.';
  mode: 'self' | 'employee' | 'admin' = 'self';
  employeeId: number | null = null;

  from = '';
  to = this.formatDate(new Date());
  batchDate = this.formatDate(new Date());

  page = 0;
  size = 10;
  totalPages = 0;
  totalElements = 0;

  isLoading = false;
  isBatchRunning = false;
  errorMessage = '';
  batchErrorMessage = '';
  batchSuccessMessage = '';

  readonly pageSizeOptions = [10, 20, 50, 100];

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const today = new Date();
    this.to = this.formatDate(today);
    this.from = this.formatDate(new Date(today.getFullYear(), today.getMonth(), 1));

    this.route.data.subscribe((data) => {
      this.mode = (data['mode'] as 'self' | 'employee' | 'admin' | undefined) ?? 'self';
      this.employeeId = this.resolveEmployeeId();
      this.applyModeMetadata();
      this.loadRecords();
    });
  }

  records: AttendanceDailyResponse[] = [];

  get currentPage(): number {
    return this.page + 1;
  }

  get isLastPage(): boolean {
    return this.totalPages > 0 && this.page >= this.totalPages - 1;
  }

  get canRunBatch(): boolean {
    return this.mode === 'admin' && !this.isBatchRunning && !!this.batchDate;
  }

  onApplyFilters(): void {
    this.page = 0;
    this.loadRecords();
  }

  onPageSizeChange(): void {
    this.page = 0;
    this.loadRecords();
  }

  prevPage(): void {
    if (this.page <= 0 || this.isLoading) {
      return;
    }

    this.page -= 1;
    this.loadRecords();
  }

  nextPage(): void {
    if (this.isLastPage || this.isLoading) {
      return;
    }

    this.page += 1;
    this.loadRecords();
  }

  onRunBatch(): void {
    if (!this.canRunBatch) {
      return;
    }

    this.isBatchRunning = true;
    this.batchErrorMessage = '';
    this.batchSuccessMessage = '';

    this.attendanceService
      .runAttendanceBatch(this.batchDate)
      .pipe(finalize(() => (this.isBatchRunning = false)))
      .subscribe({
        next: (response: AttendanceBatchResponse) => {
          this.batchSuccessMessage = response.message || 'Attendance batch completed.';
          this.loadRecords();
        },
        error: (error) => {
          this.batchErrorMessage = this.extractErrorMessage(error, 'Failed to run attendance batch.');
        },
      });
  }

  trackByAttendanceId(_: number, record: AttendanceDailyResponse): number {
    return record.attendanceId;
  }

  formatDateTime(value: string | null): string {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString();
  }

  formatNumber(value: number | null): number {
    return value ?? 0;
  }

  private loadRecords(): void {
    this.errorMessage = '';
    this.batchSuccessMessage = '';

    if (!this.from || !this.to) {
      this.records = [];
      this.totalElements = 0;
      this.totalPages = 0;
      this.errorMessage = 'From and To dates are required.';
      return;
    }

    if (this.to < this.from) {
      this.records = [];
      this.totalElements = 0;
      this.totalPages = 0;
      this.errorMessage = 'To date must be on or after From date.';
      return;
    }

    this.isLoading = true;

    let request$;
    try {
      request$ = this.getAttendanceRequest();
    } catch (error) {
      this.isLoading = false;
      this.records = [];
      this.totalElements = 0;
      this.totalPages = 0;
      this.errorMessage = this.extractErrorMessage(error, 'Failed to load attendance records.');
      return;
    }

    request$
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.records = response.content ?? [];
          this.totalElements = response.totalElements ?? 0;
          this.totalPages = response.totalPages ?? 0;
          this.page = response.number ?? this.page;
          this.size = response.size ?? this.size;
        },
        error: (error) => {
          this.records = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.errorMessage = this.extractErrorMessage(error, 'Failed to load attendance records.');
        },
      });
  }

  private getAttendanceRequest() {
    if (this.mode === 'admin') {
      return this.attendanceService.getAttendanceDailyAdmin(this.from, this.to, this.page, this.size);
    }

    if (this.mode === 'employee') {
      if (!this.employeeId) {
        throw new Error('Employee ID is required for employee attendance view.');
      }
      return this.attendanceService.getAttendanceDailyByEmployee(this.employeeId, this.from, this.to, this.page, this.size);
    }

    return this.attendanceService.getMyAttendanceDaily(this.from, this.to, this.page, this.size);
  }

  private resolveEmployeeId(): number | null {
    if (this.mode === 'employee') {
      const routeEmployeeId = Number(this.route.snapshot.paramMap.get('employeeId'));
      return Number.isInteger(routeEmployeeId) && routeEmployeeId > 0 ? routeEmployeeId : null;
    }

    return this.authService.getEmployeeId();
  }

  private applyModeMetadata(): void {
    if (this.mode === 'admin') {
      this.title = 'Attendance Daily Admin';
      this.description = 'Review calculated attendance records for all employees in the selected date range.';
      return;
    }

    if (this.mode === 'employee') {
      this.title = 'Attendance Daily By Employee';
      this.description = 'Review calculated attendance records for the selected employee.';
      return;
    }

    this.title = 'My Attendance Daily';
    this.description = 'Review your calculated attendance records for the selected date range.';
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    const message =
      (error as { error?: { message?: string }; message?: string })?.error?.message ||
      (error as { message?: string })?.message;
    return message || fallback;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }
}
