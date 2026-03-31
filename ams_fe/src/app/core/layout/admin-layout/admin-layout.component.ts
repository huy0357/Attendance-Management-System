import { AfterViewInit, Component, ElementRef, OnDestroy, QueryList, ViewChildren } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { UiStateService, Density } from '../ui-state.service';
import { NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SettingsService, ThemeMode } from '../../../features/admin/settings/settings.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  requiredRoles?: string[];
  activeMatchPaths?: string[];
}

@Component({
  standalone: false,
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
})
export class AdminLayoutComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('navLink', { read: ElementRef }) navLinks!: QueryList<ElementRef<HTMLElement>>;

  density: Density = 'comfortable';
  userMenuOpen = false;
  theme: ThemeMode = 'light';
  compactSidebar = false;
  private readonly subscriptions = new Subscription();

  navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'layout-dashboard' },
    { label: 'Employees', path: '/hrm/employees', icon: 'users', requiredRoles: ['ADMIN', 'HR'] },
    { label: 'Employee Portal', path: '/hrm/employee-portal', icon: 'user', requiredRoles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { label: 'Departments', path: '/hrm/departments', icon: 'building', requiredRoles: ['ADMIN', 'HR', 'MANAGER'] },
    { label: 'Scheduling', path: '/attendance/scheduling', icon: 'calendar', requiredRoles: ['ADMIN'] },
    {
      label: 'Attendance Daily',
      path: '/attendance/attendance-daily',
      icon: 'clock',
      requiredRoles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
      activeMatchPaths: [
        '/attendance/attendance-daily',
        '/attendance/attendance-daily/admin',
        '/attendance/attendance-daily/employee',
      ],
    },

    { label: 'Shift Templates', path: '/attendance/shift-templates', icon: 'calendar', requiredRoles: ['ADMIN', 'HR', 'MANAGER'] },
    { label: 'Attendance Email', path: '/attendance/attendance-email', icon: 'mail', requiredRoles: ['ADMIN', 'HR', 'MANAGER'] },
    { label: 'Leave Requests', path: '/attendance/leave-management', icon: 'clipboard-check', requiredRoles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { label: 'OT Requests', path: '/attendance/ot-requests', icon: 'clock', requiredRoles: ['MANAGER'] },
    { label: 'Requests', path: '/attendance/requests-management', icon: 'clipboard-check', requiredRoles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { label: 'Accounts', path: '/admin/account-management', icon: 'users', requiredRoles: ['ADMIN'] },
    { label: 'Audit Logs', path: '/admin/audit-log', icon: 'clipboard-list', requiredRoles: ['ADMIN'] },
    { label: 'Settings', path: '/admin/settings', icon: 'settings', requiredRoles: ['ADMIN'] },
  ];

  get visibleNavItems(): NavItem[] {
    return this.navItems.filter(item => {
      if (!item.requiredRoles || item.requiredRoles.length === 0) {
        return this.authService.isAuthenticated();
      }
      return this.authService.hasAnyRole(item.requiredRoles);
    });
  }

  hasRole(roles: string[]): boolean {
    if (!roles || roles.length === 0) {
      return false;
    }
    return this.authService.hasAnyRole(roles);
  }

  get isAdmin(): boolean {
    return this.hasRole(['ADMIN']);
  }

  get displayUsername(): string {
    return this.authService.getUsername() ?? 'User';
  }

  get displayRoleLabel(): string {
    const role = this.authService.getNormalizedRole();
    if (!role) {
      return 'Authenticated User';
    }

    switch (role) {
      case 'ADMIN':
        return 'System Administrator';
      case 'HR':
        return 'HR';
      case 'MANAGER':
        return 'Manager';
      case 'EMPLOYEE':
        return 'Employee';
      default:
        return role;
    }
  }

  get displayInitials(): string {
    return this.displayUsername
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('') || 'U';
  }

  constructor(
    private router: Router,
    private authService: AuthService,
    private uiState: UiStateService,
    private settingsService: SettingsService,
  ) {
    this.density = this.uiState.getDensity();
    this.theme = this.settingsService.theme;
    this.compactSidebar = this.settingsService.compactSidebar;
  }

  ngAfterViewInit(): void {
    this.scrollActiveNavItemIntoView();

    this.subscriptions.add(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(() => this.scrollActiveNavItemIntoView()),
    );

    this.subscriptions.add(
      this.navLinks.changes.subscribe(() => this.scrollActiveNavItemIntoView()),
    );

    this.subscriptions.add(
      this.settingsService.theme$.subscribe(theme => {
        this.theme = theme;
      }),
    );

    this.subscriptions.add(
      this.settingsService.compactSidebar$.subscribe(compactSidebar => {
        this.compactSidebar = compactSidebar;
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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

  isActive(item: NavItem): boolean {
    const matchPaths = item.activeMatchPaths && item.activeMatchPaths.length > 0
      ? item.activeMatchPaths
      : [this.resolveNavPath(item)];

    return matchPaths.some(path => this.router.url === path || this.router.url.startsWith(`${path}/`));
  }

  resolveNavPath(item: NavItem): string {
    if (item.path === '/attendance/attendance-daily') {
      return this.resolveAttendanceDailyPath();
    }
    return item.path;
  }

  navigateTo(path?: string): void {
    if (!path) {
      return;
    }
    this.router.navigate([path]);
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

  private scrollActiveNavItemIntoView(): void {
    requestAnimationFrame(() => {
      const activeLink = this.navLinks?.find(link =>
        link.nativeElement.classList.contains('bg-blue-600'),
      );

      activeLink?.nativeElement.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    });
  }

  private resolveAttendanceDailyPath(): string {
    return this.hasRole(['ADMIN'])
      ? '/attendance/attendance-daily/admin'
      : '/attendance/attendance-daily';
  }
}

