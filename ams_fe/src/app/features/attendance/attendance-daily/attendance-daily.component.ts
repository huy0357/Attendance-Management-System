import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { AttendanceService, ScheduleEmployee } from '../attendance.service';
import { AttendanceDailyService } from './attendance-daily.service';
import { AttendanceDailyResponse } from '../models/attendance-daily.model';

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

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly attendanceDailyService: AttendanceDailyService,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const today = new Date();
    this.to = this.formatDate(today);
    this.from = this.formatDate(new Date(today.getFullYear(), today.getMonth(), 1));

    this.route.data.subscribe((data) => {
      this.mode = (data['mode'] as 'self' | 'employee' | 'admin' | undefined) ?? 'self';
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
    this.loadRecords();
  }

  onDateChange(): void {
    this.page = 0;
    this.loadRecords();
  }

  onPageSizeChange(): void {
    this.page = 0;
    this.loadRecords();
  }

  prevPage(): void {
    if (this.page <= 0 || this.isLoading) return;
    this.page -= 1;
    this.loadRecords();
  }

  nextPage(): void {
    if (this.isLastPage || this.isLoading) return;
    this.page += 1;
    this.loadRecords();
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

  formatDateTime(value: string | null): string {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  private loadRecords(): void {
    this.errorMessage = '';

    if (!this.from || !this.to) {
      this.resetState('From and To dates are required.');
      return;
    }

    if (this.to < this.from) {
      this.resetState('To date must be on or after From date.');
      return;
    }

    this.isLoading = true;

    const request$ = this.activeTab === 'all' 
      ? this.attendanceDailyService.getAttendanceDailyAdmin(this.from, this.to, this.page, this.size)
      : this.attendanceDailyService.getMyAttendanceDaily(this.from, this.to, this.page, this.size);

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
