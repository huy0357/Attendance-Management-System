import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Data } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import {
  AttendanceDailyResponse,
  AttendanceService,
} from '../attendance.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SpringPage } from '../../../shared/models/page-response.model';

type AttendanceDailyMode = 'admin' | 'employee' | 'me';

@Component({
  standalone: false,
  selector: 'app-attendance-daily',
  templateUrl: './attendance-daily.component.html',
  styleUrls: ['./attendance-daily.component.scss'],
})
export class AttendanceDailyComponent implements OnInit {
  records: AttendanceDailyResponse[] = [];
  mode: AttendanceDailyMode = 'me';
  employeeId: number | null = null;

  from = '';
  to = '';
  page = 0;
  size = 20;
  totalPages = 0;
  totalElements = 0;

  isLoading = false;
  errorMessage = '';

  readonly pageSizeOptions = [10, 20, 50];

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.initializeDateRange();
    this.resolveScreenContext(this.route.snapshot.data);
    this.loadAttendance();
  }

  get title(): string {
    if (this.mode === 'admin') {
      return 'Attendance Daily';
    }
    if (this.mode === 'employee') {
      return `Attendance Daily - Employee #${this.employeeId ?? ''}`;
    }
    return 'My Attendance Daily';
  }

  get description(): string {
    if (this.mode === 'admin') {
      return 'Daily attendance summary across all employees.';
    }
    if (this.mode === 'employee') {
      return 'Daily attendance summary for the selected employee.';
    }
    return 'Daily attendance summary from your authenticated account.';
  }

  onApplyFilters(): void {
    this.page = 0;
    this.loadAttendance();
  }

  onPageSizeChange(): void {
    this.page = 0;
    this.loadAttendance();
  }

  prevPage(): void {
    if (this.page <= 0 || this.isLoading) {
      return;
    }
    this.page -= 1;
    this.loadAttendance();
  }

  nextPage(): void {
    if (this.isLastPage || this.isLoading) {
      return;
    }
    this.page += 1;
    this.loadAttendance();
  }

  get currentPage(): number {
    return this.page + 1;
  }

  get isLastPage(): boolean {
    return this.totalPages === 0 || this.page >= this.totalPages - 1;
  }

  trackByAttendanceId(_: number, record: AttendanceDailyResponse): number {
    return record.attendanceId;
  }

  formatDateTime(value: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  formatNumber(value: number | null): string {
    return value == null ? '-' : `${value}`;
  }

  private loadAttendance(): void {
    if (!this.from || !this.to) {
      this.errorMessage = 'From date and To date are required.';
      this.records = [];
      this.totalElements = 0;
      this.totalPages = 0;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.getAttendanceRequest()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.bindPage(response);
        },
        error: (error: HttpErrorResponse) => {
          this.records = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  private getAttendanceRequest() {
    if (this.employeeId) {
      return this.attendanceService.getAttendanceDailyByEmployee(this.employeeId, this.from, this.to, this.page, this.size);
    }

    if (this.mode === 'admin') {
      return this.attendanceService.getAttendanceDailyAdmin(this.from, this.to, this.page, this.size);
    }

    return this.attendanceService.getMyAttendanceDaily(this.from, this.to, this.page, this.size);
  }

  private bindPage(response: SpringPage<AttendanceDailyResponse>): void {
    this.records = response.content ?? [];
    this.totalElements = response.totalElements ?? 0;
    this.totalPages = response.totalPages ?? 0;
    this.page = response.number ?? this.page;
    this.size = response.size ?? this.size;
  }

  private resolveScreenContext(data: Data): void {
    const routeMode = data['mode'] as AttendanceDailyMode | undefined;
    if (routeMode) {
      this.mode = routeMode;
    } else {
      this.mode = this.authService.getRole()?.toUpperCase().replace('ROLE_', '') === 'ADMIN' ? 'admin' : 'me';
    }

    const employeeIdParam = this.route.snapshot.paramMap.get('employeeId');
    this.employeeId = employeeIdParam ? Number(employeeIdParam) : null;
    if (this.employeeId !== null && !Number.isFinite(this.employeeId)) {
      this.employeeId = null;
    }
  }

  private initializeDateRange(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.from = this.toDateInputValue(firstDay);
    this.to = this.toDateInputValue(today);
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 403) {
      return 'You do not have permission to view this attendance data.';
    }
    if (error.status === 400) {
      return error.error?.message || 'Invalid filter parameters.';
    }
    return 'Unable to load attendance daily data.';
  }
}
