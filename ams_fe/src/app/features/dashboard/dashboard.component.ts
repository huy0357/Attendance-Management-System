import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UiStateService, Density } from '../../core/layout/ui-state.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: false,
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  density: Density = 'comfortable';
  selectedTimeRange = 'Today';

  constructor(
    private uiState: UiStateService,
    private authService: AuthService,
    private router: Router,
  ) {
    this.density = this.uiState.getDensity();
  }

  ngOnInit(): void {
    this.uiState.density$.subscribe(density => {
      this.density = density;
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
      : 'This dashboard now stays honest about backend support and only links to live FE flows.';
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
