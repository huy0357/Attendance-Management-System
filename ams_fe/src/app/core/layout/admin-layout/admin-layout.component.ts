import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { UiStateService, Density } from '../ui-state.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  requiredRoles?: string[];
}

interface NotificationItem {
  id: number;
  title: string;
  time: string;
  type: 'warning' | 'info' | 'success';
  unread: boolean;
}

@Component({
  standalone: false,
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
})
export class AdminLayoutComponent {
  density: Density = 'comfortable';
  densityOptions: Density[] = ['compact', 'comfortable', 'spacious'];
  chatbotOpen = false;
  notificationsOpen = false;
  searchOpen = false;
  searchQuery = '';
  userMenuOpen = false;
  notificationsEnabled = true;
  darkMode = false;
  language: 'en' | 'es' | 'fr' | 'de' | 'zh' = 'en';
  autoSaveEnabled = true;
  lastAutoSave = new Date();

  notifications: NotificationItem[] = [
    { id: 1, title: '5 payslips awaiting approval', time: '5 min ago', type: 'warning', unread: true },
    { id: 2, title: 'John Doe checked in late', time: '1 hour ago', type: 'info', unread: true },
    { id: 3, title: 'Weekly report generated', time: '2 hours ago', type: 'success', unread: false },
    { id: 4, title: 'System update completed', time: '1 day ago', type: 'success', unread: false },
  ];

  navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'layout-dashboard' },
    { label: 'Employees', path: '/hrm/employees', icon: 'users', requiredRoles: ['ADMIN', 'HR', 'MANAGER'] },
    { label: 'Employee Portal', path: '/hrm/employee-portal', icon: 'user' },
    { label: 'Departments', path: '/hrm/departments', icon: 'building', requiredRoles: ['ADMIN', 'HR', 'MANAGER'] },
    { label: 'Contracts', path: '/hrm/contracts', icon: 'file-text', requiredRoles: ['ADMIN', 'HR', 'MANAGER'] },
    { label: 'Scheduling', path: '/attendance/scheduling', icon: 'calendar' },
    { label: 'Time & Attendance', path: '/attendance/time-calculation', icon: 'clock' },
    { label: 'Leave Management', path: '/attendance/leave-management', icon: 'clipboard-check' },
    { label: 'OT Requests', path: '/attendance/ot-requests', icon: 'calculator' },
    { label: 'Performance & KPI', path: '/hrm/performance-review', icon: 'target', requiredRoles: ['ADMIN', 'HR', 'MANAGER'] },
    { label: 'Onboarding/Exit', path: '/hrm/onboarding', icon: 'user-plus', requiredRoles: ['ADMIN', 'HR'] },
    { label: 'Payroll Formula', path: '/payroll/formula', icon: 'dollar-sign', requiredRoles: ['ADMIN', 'HR'] },
    { label: 'Payroll Review', path: '/payroll/review', icon: 'dollar-sign', requiredRoles: ['ADMIN', 'HR'] },
    { label: 'Payroll Periods', path: '/payroll/periods', icon: 'lock', requiredRoles: ['ADMIN', 'HR'] },
    { label: 'Tax Configuration', path: '/payroll/tax-configuration', icon: 'shield', requiredRoles: ['ADMIN'] },
    { label: 'Organization', path: '/hrm/org-chart', icon: 'users', requiredRoles: ['ADMIN', 'HR', 'MANAGER'] },
    { label: 'Audit Log', path: '/admin/audit-log', icon: 'file-text', requiredRoles: ['ADMIN'] },
    { label: 'Reports', path: '/reports/standard', icon: 'bar-chart-3', requiredRoles: ['ADMIN', 'HR', 'MANAGER'] },
    { label: 'Custom Reports', path: '/reports/custom', icon: 'edit', requiredRoles: ['ADMIN', 'HR'] },
    { label: 'Backup & Restore', path: '/admin/backup-restore', icon: 'database', requiredRoles: ['ADMIN'] },
    { label: 'Accounts', path: '/admin/account-management', icon: 'users', requiredRoles: ['ADMIN'] },
    { label: 'Settings', path: '/admin/settings', icon: 'settings', requiredRoles: ['ADMIN'] },
  ];

  get visibleNavItems(): NavItem[] {
    const userRole = this.authService.getRole();
    if (!userRole) {
      return this.navItems.filter(item => !item.requiredRoles || item.requiredRoles.length === 0);
    }

    const normalizedUserRole = userRole.toUpperCase().replace('ROLE_', '');
    return this.navItems.filter(item => {
      if (!item.requiredRoles || item.requiredRoles.length === 0) {
        return true;
      }
      return item.requiredRoles.some(role =>
        role.toUpperCase().replace('ROLE_', '') === normalizedUserRole
      );
    });
  }

  hasRole(roles: string[]): boolean {
    const userRole = this.authService.getRole();
    if (!userRole || !roles || roles.length === 0) {
      return false;
    }
    const normalizedUserRole = userRole.toUpperCase().replace('ROLE_', '');
    return roles.some(role => role.toUpperCase().replace('ROLE_', '') === normalizedUserRole);
  }

  get isAdmin(): boolean {
    return this.hasRole(['ADMIN']);
  }

  constructor(private router: Router, private authService: AuthService, private uiState: UiStateService) {
    this.density = this.uiState.getDensity();
  }

  get densityClass(): string {
    if (this.density === 'compact') {
      return 'py-1.5 px-3 text-sm';
    }
    if (this.density === 'spacious') {
      return 'py-4 px-5 text-lg';
    }
    return 'py-2.5 px-4 text-base';
  }

  setDensity(density: Density): void {
    this.density = density;
    this.uiState.setDensity(density);
  }

  get searchResults(): Array<{ name: string; type: string; path?: string }> {
    const baseResults = [
      { name: 'Sarah Chen', type: 'Employee', path: '/hrm/employees' },
      { name: 'Payroll Formula', type: 'Page', path: '/payroll/formula' },
      { name: 'Attendance Report', type: 'Report', path: '/reports/standard' },
    ];

    return baseResults.filter(item => item.name.toLowerCase().includes(this.searchQuery.toLowerCase()));
  }

  isActive(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(`${path}/`);
  }

  navigateTo(path?: string): void {
    if (!path) {
      return;
    }
    this.router.navigate([path]);
    this.searchOpen = false;
  }

  closeSearchDelayed(): void {
    setTimeout(() => {
      this.searchOpen = false;
    }, 200);
  }

  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      },
    });
  }
}

