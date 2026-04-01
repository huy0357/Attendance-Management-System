import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AttendanceService, ScheduleEmployee } from '../attendance.service';
import { AttendanceDailyService } from './attendance-daily.service';
import { AttendanceDailyResponse } from '../models/attendance-daily.model';
import { SpringPage } from '../../../shared/models/page-response.model';

@Component({
  standalone: false,
  selector: 'app-attendance-daily',
  templateUrl: './attendance-daily.component.html',
  styleUrls: ['./attendance-daily.component.scss'],
})
export class AttendanceDailyComponent implements OnInit, OnDestroy {
  title = 'Time & Attendance Logs';
  mode: 'self' | 'employee' | 'admin' = 'self';
  isAdmin = false;
  activeTab: 'all' | 'me' = 'all';

  from = '';
  to = '';

  page = 0;
  size = 10;
  totalPages = 0;
  totalElements = 0;

  isLoading = false;
  errorMessage = '';

  readonly pageSizeOptions = [10, 20, 50];

  private static readonly ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  private static readonly MAX_ADMIN_BATCH_RANGE_DAYS = 62;

  records: AttendanceDailyResponse[] = [];
  employeesMap = new Map<number, ScheduleEmployee>();

  // --- Monthly Summary Modal State ---
  isMonthlyModalOpen = false;
  summaryMonth = this.formatMonthInput(new Date());
  isGeneratingSummary = false;
  isExportingSummary = false;
  summarySuccessMessage = '';
  summaryErrorMessage = '';
  private summarySuccessMessageTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  /** Đã chạy POST run-batch cho khoảng này trong phiên admin (tránh lặp khi chỉ đổi trang). */
  private lastSyncedAdminRange: { from: string; to: string } | null = null;
  private lastResolvedRouteMode: 'self' | 'employee' | 'admin' | null = null;

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly attendanceDailyService: AttendanceDailyService,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.applyDefaultDateRangeToTodayLocal();

    this.route.data.subscribe((data) => {
      const mode = (data['mode'] as 'self' | 'employee' | 'admin' | undefined) ?? 'self';
      if (this.lastResolvedRouteMode !== mode) {
        this.lastSyncedAdminRange = null;
        this.lastResolvedRouteMode = mode;
      }
      this.mode = mode;
      this.isAdmin = this.mode === 'admin';
      this.activeTab = this.isAdmin ? 'all' : 'me';

      this.loadEmployees();
      this.loadRecords();
    });
  }

  get currentPage(): number {
    return this.page + 1;
  }

  get isLastPage(): boolean {
    return this.totalPages > 0 && this.page >= this.totalPages - 1;
  }

  onTabChange(tab: 'all' | 'me'): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.page = 0;
    this.loadRecords({ skipAdminBatch: true });
  }

  onDateChange(): void {
    this.page = 0;
    this.loadRecords();
  }

  onPageSizeChange(): void {
    this.page = 0;
    this.loadRecords({ skipAdminBatch: true });
  }

  prevPage(): void {
    if (this.page <= 0 || this.isLoading) return;
    this.page -= 1;
    this.loadRecords({ skipAdminBatch: true });
  }

  nextPage(): void {
    if (this.isLastPage || this.isLoading) return;
    this.page += 1;
    this.loadRecords({ skipAdminBatch: true });
  }

  getEmployeeName(employeeId: number): string {
    return this.employeesMap.get(employeeId)?.name || `Employee #${employeeId}`;
  }
  
  getEmployeeInitial(employeeId: number): string {
    const name = this.getEmployeeName(employeeId);
    return name ? name.charAt(0).toUpperCase() : 'E';
  }

  trackByAttendanceId(_: number, record: AttendanceDailyResponse): number {
    return record.attendanceId;
  }

  /**
   * Derives a display status from raw API fields (PRESENT + minutes flags).
   */
  getDisplayStatus(record: AttendanceDailyResponse): string {
    const status = record.status;
    if (status === 'PRESENT') {
      const late = record.lateMinutes ?? 0;
      if (late > 0) {
        return 'LATE';
      }
      const earlyLeave = record.earlyLeaveMinutes ?? 0;
      if (earlyLeave > 0) {
        return 'EARLY_LEAVE';
      }
    }
    return status ?? '-';
  }

  /**
   * Shows wall-clock HH:mm from backend LocalDateTime strings (no timezone/CET parsing).
   * Expects forms like "2026-04-01T08:00:00" or optional fractional seconds.
   */
  formatDateTime(timeStr: string | null | undefined): string {
    if (timeStr == null || String(timeStr).trim() === '') {
      return '-';
    }
    const s = String(timeStr).trim();
    const t = s.indexOf('T');
    const fragment = t >= 0 ? s.slice(t + 1) : s;
    const match = fragment.match(/^(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    return '-';
  }

  formatNumber(value: number | null): number {
    return value ?? 0;
  }

  formatHours(minutes: number | null): string {
    if (!minutes) return '0h 0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }

  private loadEmployees(): void {
    this.attendanceService.getScheduleEmployees().subscribe({
      next: (employees) => {
        employees.forEach(emp => {
          this.employeesMap.set(Number(emp.id), emp);
        });
        this.cdr.detectChanges();
      },
      error: () => {
         // silently fail employee mapping if it errors
      }
    });
  }

  private loadRecords(options?: { skipAdminBatch?: boolean }): void {
    this.errorMessage = '';

    const range = this.resolveApiDateRange();
    if (!range) {
      if (!String(this.from ?? '').trim() || !String(this.to ?? '').trim()) {
        this.resetState('From and To dates are required.');
        return;
      }
      this.resetState('From and To must be valid calendar dates (YYYY-MM-DD).');
      return;
    }

    if (range.to < range.from) {
      this.resetState('To date must be on or after From date.');
      return;
    }

    const skipAdminBatch = options?.skipAdminBatch === true;
    const needsAdminBatch =
      this.isAdmin &&
      !skipAdminBatch &&
      (this.lastSyncedAdminRange === null ||
        this.lastSyncedAdminRange.from !== range.from ||
        this.lastSyncedAdminRange.to !== range.to);

    if (needsAdminBatch) {
      const dayCount = this.attendanceDailyService.countInclusiveDays(range.from, range.to);
      if (dayCount > AttendanceDailyComponent.MAX_ADMIN_BATCH_RANGE_DAYS) {
        this.resetState(
          `Khoảng ngày quá lớn để chạy đồng bộ batch (tối đa ${AttendanceDailyComponent.MAX_ADMIN_BATCH_RANGE_DAYS} ngày). Thu hẹp From/To hoặc tách nhiều lần xem.`,
        );
        return;
      }
    }

    this.isLoading = true;

    const page$: Observable<SpringPage<AttendanceDailyResponse>> =
      this.activeTab === 'all'
        ? this.attendanceDailyService.getAttendanceDailyAdmin(range.from, range.to, this.page, this.size)
        : this.attendanceDailyService.getMyAttendanceDaily(range.from, range.to, this.page, this.size);

    const pipeline$ = needsAdminBatch
      ? this.attendanceDailyService.runAttendanceBatchForDateRange(range.from, range.to).pipe(
          switchMap(() => {
            this.lastSyncedAdminRange = { from: range.from, to: range.to };
            return page$;
          }),
        )
      : page$;

    pipeline$
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.records = response.content ?? [];
          this.totalElements = response.totalElements ?? 0;
          this.totalPages = response.totalPages ?? 0;
          this.page = response.number ?? this.page;
          this.size = response.size ?? this.size;
        },
        error: (error) => {
          this.resetState(this.extractErrorMessage(error, 'Failed to load attendance records.'));
        },
      });
  }

  private resetState(errorMsg: string): void {
    this.records = [];
    this.totalElements = 0;
    this.totalPages = 0;
    this.errorMessage = errorMsg;
    this.isLoading = false;
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const fromBody = this.stringifyHttpErrorBody(error);
      if (fromBody) {
        return this.interpretBackendFailureMessage(fromBody, fallback);
      }
    }
    const message =
      (error as { error?: { message?: string }; message?: string })?.error?.message ||
      (error as { message?: string })?.message;
    const text = typeof message === 'string' ? message : '';
    return text.trim() ? this.interpretBackendFailureMessage(text, fallback) : fallback;
  }

  private stringifyHttpErrorBody(res: HttpErrorResponse): string {
    const body = res.error;
    if (body == null) {
      return res.message || '';
    }
    if (typeof body === 'string') {
      return body;
    }
    if (typeof body === 'object') {
      const msg = (body as { message?: string }).message;
      if (typeof msg === 'string' && msg.trim()) {
        return msg;
      }
      try {
        return JSON.stringify(body);
      } catch {
        return String(body);
      }
    }
    return String(body);
  }

  /**
   * Chuẩn hóa lỗi từ Spring (HTML stack trace, Handler dispatch failed, v.v.).
   */
  private interpretBackendFailureMessage(raw: string, fallback: string): string {
    const flat = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const needle = flat.toLowerCase();

    if (
      needle.includes('noclassdeffounderror') &&
      needle.includes('attendancebatchservice')
    ) {
      return (
        'Backend thiếu hoặc lệch file class batch (AttendanceBatchService). ' +
        'Đây là lỗi JVM khi chạy Spring, không sửa được bằng frontend. ' +
        'Trong thư mục ams_be hãy chạy: mvn clean package -DskipTests, sau đó khởi động lại đúng bản JAR/ứng dụng vừa build (tránh chạy artifact cũ hoặc classpath thiếu AttendanceBatchService$1.class).'
      );
    }

    if (needle.includes('handler dispatch failed')) {
      const short = flat.length > 400 ? `${flat.slice(0, 400)}…` : flat;
      return `${short} (xem log server để biết nguyên nhân gốc).`;
    }

    if (flat.length > 0) {
      return flat.length > 500 ? `${flat.slice(0, 500)}…` : flat;
    }
    return fallback;
  }

  /** Calendar day in the user's local timezone (same as native date inputs), always YYYY-MM-DD. */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private applyDefaultDateRangeToTodayLocal(): void {
    const today = new Date();
    this.to = this.formatDate(today);
    this.from = this.formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  /**
   * Uses only the date segment from API/local strings so display stays a calendar day (no Date parsing / TZ shift).
   */
  formatWorkDateForDisplay(value: string | null | undefined): string {
    if (value == null || String(value).trim() === '') {
      return '-';
    }
    const s = String(value).trim();
    const isoPrefix = s.slice(0, 10);
    if (AttendanceDailyComponent.ISO_DATE.test(isoPrefix)) {
      return isoPrefix;
    }
    return s;
  }

  private resolveApiDateRange(): { from: string; to: string } | null {
    const from = this.normalizeDateInput(this.from);
    const to = this.normalizeDateInput(this.to);
    if (!from || !to) {
      return null;
    }
    return { from, to };
  }

  private normalizeDateInput(value: string): string | null {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
      return null;
    }
    if (AttendanceDailyComponent.ISO_DATE.test(trimmed)) {
      return trimmed;
    }
    const prefix = trimmed.slice(0, 10);
    return AttendanceDailyComponent.ISO_DATE.test(prefix) ? prefix : null;
  }

  // --- Monthly Summary Modal Logic ---
  
  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.clearSummarySuccessMessageTimer();
  }

  openMonthlyModal(): void {
    this.isMonthlyModalOpen = true;
    this.summaryMonth = this.formatMonthInput(new Date());
    this.clearSummaryMessages();
  }

  closeMonthlyModal(): void {
    this.isMonthlyModalOpen = false;
    this.clearSummaryMessages();
  }

  onGenerateSummary(): void {
    const normalizedMonth = this.getFormattedSummaryMonth();
    if (!normalizedMonth) {
      this.setSummaryError('Month must use yyyy-MM format.');
      return;
    }

    this.isGeneratingSummary = true;
    this.clearSummaryMessages();

    this.attendanceService
      .generateMonthlySummary(normalizedMonth)
      .pipe(
        finalize(() => {
          this.isGeneratingSummary = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.isGeneratingSummary = false;
          this.showSummarySuccessMessage('Monthly summary generated successfully.');
          this.cdr.detectChanges();
        },
        error: (error: HttpErrorResponse) => {
          this.isGeneratingSummary = false;
          this.setSummaryError(this.extractSummaryErrorMessage(error, 'Unable to generate monthly summary.'));
          this.cdr.detectChanges();
        },
      });
  }

  onExportSummary(): void {
    const normalizedMonth = this.getFormattedSummaryMonth();
    if (!normalizedMonth) {
      this.setSummaryError('Month must use yyyy-MM format.');
      return;
    }

    this.isExportingSummary = true;
    this.clearSummaryMessages();

    this.attendanceService
      .exportAttendanceMonthly(normalizedMonth)
      .pipe(
        finalize(() => {
          this.isExportingSummary = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.isExportingSummary = false;
          const body = response.body;
          if (!body) {
            this.setSummaryError('Export returned no file.');
            this.cdr.detectChanges();
            return;
          }

          this.downloadFile(body, this.extractFileName(response.headers.get('content-disposition')));
          this.showSummarySuccessMessage(`Report exported successfully for ${this.formatSummaryMonthLabel(normalizedMonth)}.`, 4000);
          this.cdr.detectChanges();
        },
        error: (error: HttpErrorResponse) => {
          this.isExportingSummary = false;
          this.setSummaryError(this.extractSummaryErrorMessage(error, 'Unable to export monthly summary.'));
          this.cdr.detectChanges();
        },
      });
  }

  private downloadFile(blob: Blob, fileName: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  private extractFileName(contentDisposition: string | null): string {
    const match = contentDisposition?.match(/filename="?([^"]+)"?/i);
    return match?.[1] ?? `attendance_monthly_${this.summaryMonth}.xlsx`;
  }

  private extractSummaryErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const backendMessage = error.error?.message || error.error?.error;
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
    return fallback;
  }

  private setSummaryError(message: string): void {
    this.clearSummarySuccessMessageTimer();
    this.summarySuccessMessage = '';
    this.summaryErrorMessage = message;
  }

  private clearSummaryMessages(): void {
    this.clearSummarySuccessMessageTimer();
    this.summarySuccessMessage = '';
    this.summaryErrorMessage = '';
  }

  private formatMonthInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  private normalizeSummaryMonth(value: string): string | null {
    const normalized = String(value ?? '').trim();
    return /^\d{4}-\d{2}$/.test(normalized) ? normalized : null;
  }

  private getFormattedSummaryMonth(): string | null {
    return this.normalizeSummaryMonth(this.summaryMonth);
  }

  private formatSummaryMonthLabel(month: string): string {
    const [year, monthValue] = month.split('-').map(Number);
    if (!year || !monthValue) {
      return month;
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, monthValue - 1, 1));
  }

  private showSummarySuccessMessage(message: string, durationMs: number = 3500): void {
    this.clearSummarySuccessMessageTimer();
    this.summaryErrorMessage = '';
    this.summarySuccessMessage = message;
    this.summarySuccessMessageTimeoutId = setTimeout(() => {
      this.summarySuccessMessage = '';
      this.summarySuccessMessageTimeoutId = null;
      if (!this.isDestroyed) {
        this.cdr.detectChanges();
      }
    }, durationMs);
  }

  private clearSummarySuccessMessageTimer(): void {
    if (this.summarySuccessMessageTimeoutId !== null) {
      clearTimeout(this.summarySuccessMessageTimeoutId);
      this.summarySuccessMessageTimeoutId = null;
    }
  }
}
