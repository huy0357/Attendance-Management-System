import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { AttendanceService, MonthlySummaryGenerateResponse } from '../attendance.service';

@Component({
  standalone: false,
  selector: 'app-attendance-monthly-summary',
  templateUrl: './attendance-monthly-summary.component.html',
  styleUrls: ['./attendance-monthly-summary.component.scss'],
})
export class AttendanceMonthlySummaryComponent {
  month = this.formatMonthInput(new Date());

  isGenerating = false;
  isExporting = false;

  successMessage = '';
  errorMessage = '';

  constructor(private readonly attendanceService: AttendanceService) {}

  onGenerate(): void {
    const normalizedMonth = this.normalizeMonth(this.month);
    if (!normalizedMonth) {
      this.setError('Month must use yyyy-MM format.');
      return;
    }

    this.isGenerating = true;
    this.clearMessages();

    this.attendanceService
      .generateMonthlySummary(normalizedMonth)
      .pipe(finalize(() => (this.isGenerating = false)))
      .subscribe({
        next: (response: MonthlySummaryGenerateResponse) => {
          this.successMessage = `${response.message} (${response.affectedRows} affected rows).`;
        },
        error: (error: HttpErrorResponse) => {
          this.setError(this.extractErrorMessage(error, 'Unable to generate monthly summary.'));
        },
      });
  }

  onExport(): void {
    const normalizedMonth = this.normalizeMonth(this.month);
    if (!normalizedMonth) {
      this.setError('Month must use yyyy-MM format.');
      return;
    }

    this.isExporting = true;
    this.clearMessages();

    this.attendanceService
      .exportAttendanceMonthly(normalizedMonth)
      .pipe(finalize(() => (this.isExporting = false)))
      .subscribe({
        next: (response: HttpResponse<Blob>) => {
          const body = response.body;
          if (!body) {
            this.setError('Export returned no file.');
            return;
          }

          this.downloadFile(body, this.extractFileName(response.headers.get('content-disposition')));
          this.successMessage = `Exported monthly summary for ${this.month}.`;
        },
        error: (error: HttpErrorResponse) => {
          this.setError(this.extractErrorMessage(error, 'Unable to export monthly summary.'));
        },
      });
  }

  private downloadFile(blob: Blob, fileName: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  private extractFileName(contentDisposition: string | null): string {
    const match = contentDisposition?.match(/filename="?([^"]+)"?/i);
    return match?.[1] ?? `attendance_monthly_${this.month}.xlsx`;
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

  private setError(message: string): void {
    this.successMessage = '';
    this.errorMessage = message;
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
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
