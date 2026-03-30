import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { UiStateService, Density } from '../../core/layout/ui-state.service';
import { AuthService } from '../../core/auth/auth.service';
import { EmployeeService } from '../hrm/employees/employee.service';
import { DepartmentService } from '../hrm/departments/department.service';
import { RequestsService } from '../../core/services/requests.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  standalone: false,
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  density: Density = 'comfortable';
  selectedTimeRange = 'Today';

  // KPI state
  isLoading = true;
  totalEmployees: number | null = null;
  totalDepartments: number | null = null;
  totalRequests: number | null = null;
  pendingRequests: number | null = null;
  approvedRequests: number | null = null;
  kpiError = false;

  constructor(
    private uiState: UiStateService,
    private authService: AuthService,
    private router: Router,
    private employeeService: EmployeeService,
    private departmentService: DepartmentService,
    private requestsService: RequestsService,
    private profileService: ProfileService,
    private cdr: ChangeDetectorRef,
  ) {
    this.density = this.uiState.getDensity();
  }

  ngOnInit(): void {
    this.uiState.density$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(density => {
        this.density = density;
      });
    this.loadKpis();
  }

  private loadKpis(): void {
    this.isLoading = true;

    // Fetch employees & departments unconditionally; wrap requests behind employeeId lookup
    const employees$ = this.employeeService.getAll().pipe(catchError(() => of([])));
    const departments$ = this.departmentService.getAll(1, 1000).pipe(catchError(() => of({ items: [], totalItems: 0, totalPages: 0, page: 1, size: 1000, hasNext: false, hasPrev: false })));

    // For requests we need an employeeId from profile context
    const requests$ = this.profileService.resolveEmployeeIdFromAuthContext().pipe(
      catchError(() => of(null))
    );

    forkJoin([employees$, departments$, requests$]).pipe(
      switchMap(([employees, deptPage, employeeId]) => {
        this.totalEmployees = Array.isArray(employees) ? employees.length : null;
        this.totalDepartments = deptPage.totalItems ?? deptPage.items?.length ?? null;

        if (employeeId == null) {
          this.totalRequests = null;
          this.pendingRequests = null;
          this.approvedRequests = null;
          return of(null);
        }

        return this.requestsService.getRequestsByEmployee(employeeId).pipe(
          catchError(() => of([])),
        );
      }),
      finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (requests) => {
        if (!requests) {
          return;
        }

        this.totalRequests = requests.length;
        this.pendingRequests = requests.filter(r => r.status === 'SUBMITTED').length;
        this.approvedRequests = requests.filter(r => r.status === 'APPROVED').length;
        this.cdr.markForCheck();
      },
      error: () => {
        this.kpiError = true;
      }
    });
  }

  get cardPadding(): string {
    return this.density === 'compact' ? 'p-4' : this.density === 'spacious' ? 'p-8' : 'p-6';
  }

  get textSize(): string {
    return this.density === 'compact' ? 'text-sm' : this.density === 'spacious' ? 'text-lg' : 'text-base';
  }

  get canSeeAdminDashboardActions(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'HR', 'MANAGER']);
  }

  get canSeeSelfServiceDashboardActions(): boolean {
    return this.authService.hasRole('EMPLOYEE');
  }

  get dashboardTitle(): string {
    return this.canSeeSelfServiceDashboardActions ? 'Employee Dashboard' : 'Dashboard';
  }

  get dashboardDescription(): string {
    return this.canSeeSelfServiceDashboardActions
      ? 'Quick access to your self-service attendance and request flows'
      : 'Live KPIs aggregated from the active backend APIs.';
  }

  get primaryDashboardActionLabel(): string {
    return this.authService.hasRole('MANAGER') ? 'Open Requests' : 'Open Monthly Summary';
  }

  get primaryDashboardActionPath(): string {
    return this.authService.hasRole('MANAGER')
      ? '/attendance/requests-management'
      : '/attendance/monthly-summary';
  }

  goTo(path: string): void {
    this.router.navigate([path]);
  }

  goToAttendanceDaily(): void {
    const path = this.authService.hasRole('ADMIN')
      ? '/attendance/attendance-daily/admin'
      : '/attendance/attendance-daily';
    this.goTo(path);
  }

  goToLeaveRequests(): void {
    this.goTo('/attendance/leave-management');
  }

  goToMyRequests(): void {
    this.goTo('/attendance/requests-management');
  }

  goToEmployeePortal(): void {
    this.goTo('/hrm/employee-portal');
  }
}
