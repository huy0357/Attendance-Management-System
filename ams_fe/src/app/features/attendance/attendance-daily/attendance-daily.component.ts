import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {
  AttendanceBatchResponse,
  AttendanceDailyResponse,
  AttendanceService,
} from '../attendance.service';

type AttendanceDailyMode = 'admin' | 'employee' | 'me';

@Component({
  standalone: false,
  selector: 'app-attendance-daily',
  templateUrl: './attendance-daily.component.html',
  styleUrls: ['./attendance-daily.component.scss'],
})
export class AttendanceDailyComponent implements OnInit {
  title = 'Attendance Daily';
  description = 'Review calculated attendance records by date range and employee.';
  mode: AttendanceDailyMode = 'admin';

  from = this.formatDate(this.addDays(new Date(), -7));
  to = this.formatDate(new Date());
  batchDate = this.formatDate(new Date());
  employeeId: number | null = null;

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
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.mode = (data['mode'] as AttendanceDailyMode | undefined) ?? 'admin';
      this.applyModeMetadata();
      this.resolveEmployeeIdFromRoute();
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
    this.resolveEmployeeIdFromRoute();

    if (!this.from || !this.to) {
      this.records = [];
      this.totalElements = 0;
      this.totalPages = 0;
      this.errorMessage = 'From and To dates are required.';
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
      .pipe(finalize(() => (this.isLoading = false)))
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
    if (this.mode === 'me') {
      return this.attendanceService.getMyAttendanceDaily(this.from, this.to, this.page, this.size);
    }

    if (this.mode === 'employee') {
      if (!this.employeeId || this.employeeId <= 0) {
        throw new Error('Employee ID is required for employee attendance view.');
      }

      return this.attendanceService.getAttendanceDailyByEmployee(
        this.employeeId,
        this.from,
        this.to,
        this.page,
        this.size,
      );
    }

    if (this.employeeId && this.employeeId > 0) {
      return this.attendanceService.getAttendanceDailyByEmployee(
        this.employeeId,
        this.from,
        this.to,
        this.page,
        this.size,
      );
    }

    return this.attendanceService.getAttendanceDailyAdmin(this.from, this.to, this.page, this.size);
  }

  private resolveEmployeeIdFromRoute(): void {
    const routeEmployeeId = Number(this.route.snapshot.paramMap.get('employeeId'));
    if (this.mode === 'employee' && Number.isInteger(routeEmployeeId) && routeEmployeeId > 0) {
      this.employeeId = routeEmployeeId;
    }
  }

  private applyModeMetadata(): void {
    if (this.mode === 'me') {
      this.title = 'My Attendance Daily';
      this.description = 'Review your calculated attendance records for the selected date range.';
      return;
    }

    if (this.mode === 'employee') {
      this.title = 'Employee Attendance Daily';
      this.description = 'Review calculated attendance records for a specific employee.';
      return;
    }

    this.title = 'Attendance Daily';
    this.description = 'Review calculated attendance records by date range and employee.';
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
