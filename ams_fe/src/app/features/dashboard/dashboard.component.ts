import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { UiStateService, Density } from '../../core/layout/ui-state.service';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService } from './dashboard.service';
import {
  DashboardKpiResponse,
  LivePulseResponse,
  ExceptionsResponse,
  ExceptionRecord,
} from '../../shared/models/dashboard.model';

@Component({
  standalone: false,
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  density: Density = 'comfortable';

  // ── Loading & error state ──────────────────────────────────────
  isLoading = true;
  kpiError = false;

  // ── KPI data ───────────────────────────────────────────────────
  kpi: DashboardKpiResponse | null = null;

  // ── Live Pulse ─────────────────────────────────────────────────
  livePulse: LivePulseResponse | null = null;
  livePulseLoading = false;
  livePulseError = false;

  // ── Exceptions ─────────────────────────────────────────────────
  exceptionsData: ExceptionsResponse | null = null;
  exceptionsLoading = false;
  exceptionsError = false;

  // ── Resolve Modal ──────────────────────────────────────────────
  showResolveModal = false;
  resolvingException: ExceptionRecord | null = null;
  resolveNotes = '';
  resolveLoading = false;
  resolveSuccess = false;
  resolveError = '';

  // ── Date filter for KPI ────────────────────────────────────────
  selectedDate: string = new Date().toISOString().slice(0, 10);
  selectedTimeRange = 'Today';

  // ── Avatar color palette ───────────────────────────────────────
  private readonly avatarColors = [
    '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
    '#ef4444', '#06b6d4', '#ec4899', '#6366f1',
  ];

  constructor(
    private uiState: UiStateService,
    private authService: AuthService,
    private router: Router,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
  ) {
    this.density = this.uiState.getDensity();
  }

  ngOnInit(): void {
    this.uiState.density$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(d => (this.density = d));

    this.loadAll();
  }

  // ── Load all dashboard data in parallel ────────────────────────
  loadAll(): void {
    this.isLoading = true;
    this.kpiError = false;

    const kpi$ = this.canSeeAdminDashboardActions
      ? this.dashboardService.getKpi(this.selectedDate).pipe(catchError(() => {
          this.kpiError = true;
          return of(null);
        }))
      : of(null);

    const pulse$ = this.canSeeAdminDashboardActions
      ? this.dashboardService.getLivePulse(20, false).pipe(catchError(() => of(null)))
      : of(null);

    const exc$ = this.canSeeAdminDashboardActions
      ? this.dashboardService.getExceptions(['PENDING', 'IN_PROGRESS'], undefined, undefined, 20).pipe(catchError(() => of(null)))
      : of(null);

    forkJoin([kpi$, pulse$, exc$])
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([kpi, pulse, exc]) => {
        this.kpi = kpi;
        this.livePulse = pulse;
        this.exceptionsData = exc;
        this.cdr.markForCheck();
      });
  }

  refreshKpi(): void {
    this.loadAll();
  }

  // ── Exception Resolve Modal ────────────────────────────────────
  openResolveModal(ex: ExceptionRecord): void {
    this.resolvingException = ex;
    this.resolveNotes = '';
    this.resolveSuccess = false;
    this.resolveError = '';
    this.resolveLoading = false;
    this.showResolveModal = true;
  }

  closeResolveModal(): void {
    this.showResolveModal = false;
    this.resolvingException = null;
  }

  submitResolve(): void {
    if (!this.resolvingException) return;
    this.resolveLoading = true;
    this.resolveError = '';
    this.dashboardService
      .resolveException(this.resolvingException.id, this.resolveNotes)
      .pipe(
        finalize(() => {
          this.resolveLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.resolveSuccess = true;
          // Optimistically remove from list
          if (this.exceptionsData) {
            this.exceptionsData = {
              ...this.exceptionsData,
              exceptions: this.exceptionsData.exceptions.filter(
                e => e.id !== this.resolvingException?.id,
              ),
            };
          }
          setTimeout(() => this.closeResolveModal(), 1200);
        },
        error: () => {
          this.resolveError = 'Failed to resolve. Please try again.';
        },
      });
  }

  // ── Helpers ────────────────────────────────────────────────────
  get canSeeAdminDashboardActions(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'HR', 'MANAGER']);
  }

  get canSeeSelfServiceDashboardActions(): boolean {
    return this.authService.hasRole('EMPLOYEE');
  }

  get username(): string {
    return this.authService.getUsername() ?? 'User';
  }

  get attendanceRate(): number {
    if (!this.kpi?.presentToday) return 0;
    return Math.round(this.kpi.presentToday.percentage ?? 0);
  }

  get absentCount(): number {
    if (!this.kpi?.presentToday) return 0;
    return (this.kpi.presentToday.total ?? 0) - (this.kpi.presentToday.count ?? 0);
  }

  severityClass(severity: string): string {
    switch (severity) {
      case 'HIGH':   return 'badge-high';
      case 'MEDIUM': return 'badge-medium';
      default:       return 'badge-low';
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'RESOLVED':    return 'badge-resolved';
      case 'IN_PROGRESS': return 'badge-inprogress';
      default:            return 'badge-pending';
    }
  }

  formatTime(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  trendIcon(trend: string | undefined): string {
    if (trend === 'UP') return 'trending-up';
    if (trend === 'DOWN') return 'trending-down';
    return 'minus';
  }


  goTo(path: string): void {
    this.router.navigate([path]);
  }

  goToAttendanceDaily(): void {
    const path = this.authService.hasAnyRole(['ADMIN', 'HR'])
      ? '/attendance/attendance-daily/admin'
      : '/attendance/attendance-daily';
    this.goTo(path);
  }

  // ── Avatar helpers ─────────────────────────────────────────────
  getInitials(name: string | undefined): string {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');
  }

  getAvatarColor(name: string | undefined): string {
    if (!name) return this.avatarColors[0];
    const idx = Math.abs(
      name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    ) % this.avatarColors.length;
    return this.avatarColors[idx];
  }

  // ── Attendance pulse status helpers ───────────────────────────
  attendanceStatusLabel(rec: import('../../shared/models/dashboard.model').LivePulseRecord): string {
    return rec.lateMinutes > 0 ? 'Late' : 'On Time';
  }

  attendanceStatusIsLate(rec: import('../../shared/models/dashboard.model').LivePulseRecord): boolean {
    return rec.lateMinutes > 0;
  }

  formatCheckInTime(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  }

  get kpiAttendancePercent(): string {
    return this.kpi?.presentToday?.percentage != null
      ? (this.kpi.presentToday.percentage).toFixed(1) + '%'
      : '—';
  }

  get kpiLateAvgMin(): string {
    return this.kpi?.lateCheckins?.averageDelayMinutes != null
      ? 'Avg ' + this.kpi.lateCheckins.averageDelayMinutes + ' min'
      : '—';
  }

  get kpiNewThisMonth(): string {
    const n = this.kpi?.totalEmployees?.newThisMonth;
    if (n == null) return '';
    return (n >= 0 ? '+' : '') + n + ' this month';
  }
}
