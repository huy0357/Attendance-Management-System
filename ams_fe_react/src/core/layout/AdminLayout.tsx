import React, { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  User,
  Clock,
  ClipboardCheck,
  Users,
  Building,
  Calendar,
  Mail,
  ClipboardList,
  Settings,
  ChevronRight,
  LogOut,
  Bell,
  Menu,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useSettings } from '../../shared/hooks/useSettings';
import { useQuery } from '@tanstack/react-query';
import { profileApi } from '../../features/hrm/api/hrm.api';
import Chatbot from '../../features/chatbot/components/Chatbot';
import styles from './AdminLayout.module.scss';
import { cn } from '../../shared/utils/cn';

// ── Nav item definition ───────────────────────────────────────────────────────
interface NavItem {
  labelKey: string;
  path: string;
  icon: React.ReactNode;
  /** If omitted → visible to all authenticated users */
  requiredRoles?: string[];
  activeMatchPaths?: string[];
  /** Visual section divider label shown above this item */
  sectionLabelKey?: string;
  exact?: boolean;
}

const ICON_SIZE = { size: 17, strokeWidth: 2 } as const;

/**
 * RBAC-aware nav items.
 * Sections:
 *   [ALL]      → Dashboard, Employee Portal, Attendance Daily, Requests, My Schedule, Leave
 *   [MGR+ADM]  → OT Requests
 *   [ADMIN]    → HRM management, Payroll, Reports, Admin panel
 */
const NAV_ITEMS: NavItem[] = [
  // ── Main ─────────────────────────────────────────────────────────
  {
    labelKey: 'nav.dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard {...ICON_SIZE} />,
    requiredRoles: ['ADMIN', 'HR', 'MANAGER'],
    sectionLabelKey: 'nav.sections.main',
  },

  // ── Employee Space ──────────────────────────────────────────────
  {
    labelKey: 'nav.employeePortal',
    path: '/hrm/employee-portal',
    icon: <User {...ICON_SIZE} />,
    sectionLabelKey: 'nav.sections.mySpace',
  },
  {
    labelKey: 'nav.myAttendanceDaily',
    path: '/attendance/attendance-daily',
    icon: <Clock {...ICON_SIZE} />,
    exact: true,
  },
  {
    labelKey: 'nav.mySchedule',
    path: '/attendance/my-schedule',
    icon: <Calendar {...ICON_SIZE} />,
  },
  {
    labelKey: 'nav.requests',
    path: '/attendance/requests-management',
    icon: <ClipboardCheck {...ICON_SIZE} />,
  },
  {
    labelKey: 'nav.leaveManagement',
    path: '/attendance/leave-management',
    icon: <ClipboardList {...ICON_SIZE} />,
  },
  {
    labelKey: 'nav.myMonthlySummary',
    path: '/attendance/my-monthly-summary',
    icon: <BarChart3 {...ICON_SIZE} />,
  },

  // ── HRM Management ──────────────────────────────────────────────
  {
    labelKey: 'nav.employees',
    path: '/hrm/employees',
    icon: <Users {...ICON_SIZE} />,
    requiredRoles: ['ADMIN', 'HR'],
    sectionLabelKey: 'nav.sections.hrm',
  },
  {
    labelKey: 'nav.departments',
    path: '/hrm/departments',
    icon: <Building {...ICON_SIZE} />,
    requiredRoles: ['ADMIN', 'HR'],
  },

  // ── Attendance Management ──────────────────────────────────────────
  {
    labelKey: 'nav.attendanceDailyMgmt',
    path: '/attendance/attendance-daily/admin',
    icon: <Clock {...ICON_SIZE} />,
    requiredRoles: ['ADMIN', 'HR', 'MANAGER'],
    sectionLabelKey: 'nav.sections.attendanceMgmt',
    activeMatchPaths: [
      '/attendance/attendance-daily/admin',
      '/attendance/attendance-daily/employee',
    ],
  },
  {
    labelKey: 'nav.scheduling',
    path: '/attendance/scheduling',
    icon: <Calendar {...ICON_SIZE} />,
    requiredRoles: ['ADMIN', 'HR', 'MANAGER'],
  },
  {
    labelKey: 'nav.shiftTemplates',
    path: '/attendance/shift-templates',
    icon: <Calendar {...ICON_SIZE} />,
    requiredRoles: ['ADMIN', 'HR'],
  },
  {
    labelKey: 'nav.monthlySummary',
    path: '/attendance/monthly-summary',
    icon: <BarChart3 {...ICON_SIZE} />,
    requiredRoles: ['ADMIN', 'HR', 'MANAGER'],
  },
  {
    labelKey: 'nav.attendanceEmail',
    path: '/attendance/attendance-email',
    icon: <Mail {...ICON_SIZE} />,
    requiredRoles: ['ADMIN', 'HR'],
  },

  // ── System Administration ─────────────────────────────────────────
  {
    labelKey: 'nav.accounts',
    path: '/admin/account-management',
    icon: <Users {...ICON_SIZE} />,
    requiredRoles: ['ADMIN'],
    sectionLabelKey: 'nav.sections.system',
  },
  {
    labelKey: 'nav.auditLogs',
    path: '/admin/audit-log',
    icon: <ClipboardList {...ICON_SIZE} />,
    requiredRoles: ['ADMIN', 'HR'],
  },
  {
    labelKey: 'nav.settings',
    path: '/admin/settings',
    icon: <Settings {...ICON_SIZE} />,
    requiredRoles: ['ADMIN'],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDisplayInitials(username: string): string {
  return (
    username
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U'
  );
}

function getRoleLabel(normalizedRole: string | null, t: (key: string) => string): string {
  switch (normalizedRole) {
    case 'ADMIN':
      return t('roles.admin');
    case 'MANAGER':
      return t('roles.manager');
    case 'EMPLOYEE':
      return t('roles.employee');
    case 'HR':
      return t('roles.hr');
    default:
      return normalizedRole ?? t('roles.user');
  }
}

// ── Page Spinner fallback ─────────────────────────────────────────────────────


// ── ForbiddenToast — hiển thị khi axiosInstance bắt lỗi 403 ──────────────────
interface ForbiddenToast {
  id: number;
  message: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
const AdminLayout: React.FC = () => {
  const { username, hasAnyRole, getNormalizedRole, logout, isAuthenticated } = useAuth();
  const { compactSidebar, setCompactSidebar } = useSettings();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayUsername = username ?? 'User';
  const normalizedRole = getNormalizedRole();
  const displayRoleLabel = getRoleLabel(normalizedRole, t);
  const displayInitials = getDisplayInitials(displayUsername);

  // ── Live Clock & Date State ────────────────────────────────────────────────
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── User Profile Query (Avatar & Full Name) ─────────────────────────────
  const { data: userProfile } = useQuery({
    queryKey: ['myProfile'],
    queryFn: () => profileApi.getMyProfile(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const avatarUrl = userProfile?.avatarUrl;
  const fullName = userProfile?.fullName || displayUsername;

  const getGreeting = (hour: number) => {
    if (hour >= 5 && hour < 12) return t('greetings.morning');
    if (hour >= 12 && hour < 18) return t('greetings.afternoon');
    return t('greetings.evening');
  };

  // ── 403 Forbidden Toast Listener ─────────────────────────────────────────
  const [forbiddenToasts, setForbiddenToasts] = useState<ForbiddenToast[]>([]);
  useEffect(() => {
    const handleForbidden = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string };
      const id = Date.now();
      setForbiddenToasts((prev) => [...prev, { id, message: detail.message }]);
      setTimeout(() => {
        setForbiddenToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    window.addEventListener('ams:forbidden', handleForbidden);
    return () => window.removeEventListener('ams:forbidden', handleForbidden);
  }, []);

  // Preload application chunks in background so subsequent page transitions are instant without loading flickers
  useEffect(() => {
    const timer = setTimeout(() => {
      import('../../features/dashboard/DashboardPage');
      import('../../features/hrm/employee-portal/EmployeePortalPage');
      import('../../features/attendance/attendance-daily/AttendanceDailyPage');
      import('../../features/attendance/my-schedule/MySchedulePage');
      import('../../features/attendance/requests-management/RequestsManagementPage');
      import('../../features/attendance/leave-management/LeaveManagementPage');
      import('../../features/attendance/monthly-summary/MonthlySummaryPage');
      import('../../features/attendance/scheduling/SchedulingPage');
      import('../../features/attendance/shift-templates/ShiftTemplatesPage');
      import('../../features/attendance/attendance-email/AttendanceEmailPage');
      import('../../features/hrm/employees/EmployeesPage');
      import('../../features/hrm/departments/DepartmentsPage');
      import('../../features/admin/account-management/AccountManagementPage');
      import('../../features/admin/audit-log/AuditLogPage');
      import('../../features/admin/settings/SettingsPage');
      import('../../features/admin/profile/ProfilePage');
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.requiredRoles || item.requiredRoles.length === 0) return isAuthenticated;
    return hasAnyRole(item.requiredRoles);
  });

  const resolveNavPath = useCallback(
    (item: NavItem): string => {
      return item.path;
    },
    [],
  );

  const isActive = useCallback(
    (item: NavItem): boolean => {
      const matchPaths =
        item.activeMatchPaths && item.activeMatchPaths.length > 0
          ? item.activeMatchPaths
          : [resolveNavPath(item)];
      return matchPaths.some((p) => {
        if (item.exact) {
          return location.pathname === p;
        }
        return location.pathname === p || location.pathname.startsWith(`${p}/`);
      });
    },
    [location.pathname, resolveNavPath],
  );

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
        setNotifOpen(false);
      }
    };
    if (userMenuOpen || notifOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen, notifOpen]);

  // Scroll active nav item into view
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    requestAnimationFrame(() => {
      const activeEl = navRef.current?.querySelector(
        `.${styles['ams-nav-link--active']}`,
      ) as HTMLElement | null;
      activeEl?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={cn(styles['ams-shell'], compactSidebar ? '' : '')}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          styles['ams-sidebar'],
          compactSidebar ? styles['ams-sidebar--compact'] : '',
        )}
      >
        {/* Brand */}
        <div className={styles['ams-brand']}>
          <h1 className={styles['ams-brand-title']}>
            AMS<span>Core</span>
          </h1>
        </div>

        {/* Nav */}
        <nav ref={navRef} className={styles['ams-nav']}>
          {visibleNavItems.map((item) => {
            const active = isActive(item);
            return (
              <React.Fragment key={item.path}>
                {/* Section divider label */}
                {item.sectionLabelKey && !compactSidebar && (
                  <span className={styles['ams-nav-section-label']}>{t(item.sectionLabelKey)}</span>
                )}
                <NavLink
                  to={resolveNavPath(item)}
                  className={cn(
                    styles['ams-nav-link'],
                    active ? styles['ams-nav-link--active'] : '',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={styles['ams-nav-icon']}>{item.icon}</span>
                  <span className={styles['ams-nav-label']}>{t(item.labelKey)}</span>
                  {active && (
                    <ChevronRight
                      size={13}
                      strokeWidth={3}
                      className={styles['ams-nav-chevron']}
                    />
                  )}
                </NavLink>
              </React.Fragment>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content wrapper ─────────────────────────────────────────── */}
      <div className={styles['ams-content-wrap']}>
        {/* Header */}
        <header className={styles['ams-header']}>
          <div className={styles['ams-header-left']}>
            {/* Sidebar toggle using useSettings */}
            <button
              className={styles['ams-menu-toggle']}
              aria-label="Toggle navigation"
              type="button"
              onClick={() => setCompactSidebar(!compactSidebar)}
            >
              <Menu size={18} />
            </button>

            {/* Greeting Pill */}
            <div className={styles['ams-header-greeting']}>
              <span className={styles['ams-greeting-wave']}>👋</span>
              <span>
                {getGreeting(now.getHours())}, <strong>{fullName}</strong>!
              </span>
            </div>
          </div>

          {/* Center: Live Digital Clock & System Status */}
          <div className={styles['ams-header-center']}>
            <div className={styles['ams-clock-widget']}>
              <Clock size={14} className={styles['ams-clock-icon']} />
              <span className={styles['ams-clock-time']}>
                {now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={styles['ams-clock-divider']}>•</span>
              <span className={styles['ams-clock-date']}>
                {now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>

            <div className={styles['ams-status-badge']}>
              <span className={styles['ams-status-dot']} />
              <span>{t('greetings.systemReady')}</span>
            </div>
          </div>

          {/* Right side: bell + avatar */}
          <div className={styles['ams-header-right']} ref={menuRef}>
            {/* Notification bell */}
            <div style={{ position: 'relative' }}>
              <button
                className={styles['ams-icon-btn']}
                aria-label="Notifications"
                type="button"
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setUserMenuOpen(false);
                }}
              >
                <Bell size={17} />
                <span className={styles['ams-notif-dot']} aria-hidden="true" />
              </button>

              {/* Notification Dropdown */}
              {notifOpen && (
                <div
                  className={styles['ams-user-menu']}
                  style={{ right: '-10px', width: '280px', padding: '24px 16px', textAlign: 'center', color: 'var(--nm-text-secondary)' }}
                >
                  <Bell size={32} style={{ margin: '0 auto 12px auto', opacity: 0.2 }} />
                  <p style={{ fontWeight: 'bold', fontSize: 'var(--fs-sm)', color: 'var(--nm-text)' }}>{t('header.noNotifications')}</p>
                  <p style={{ fontSize: 'var(--fs-xs)', marginTop: '4px' }}>{t('header.allCaughtUp')}</p>
                </div>
              )}
            </div>

            {/* Avatar / user menu */}
            <button
              id="ams-user-menu-trigger"
              type="button"
              className={styles['ams-avatar-btn']}
              onClick={() => {
                setUserMenuOpen((o) => !o);
                setNotifOpen(false);
              }}
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
              aria-label="User menu"
            >
              <div className={styles['ams-avatar']}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName} className={styles['ams-avatar-img']} />
                ) : (
                  <span className={styles['ams-avatar-initials']}>{displayInitials}</span>
                )}
              </div>
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div
                id="ams-user-menu"
                className={styles['ams-user-menu']}
                role="menu"
                aria-labelledby="ams-user-menu-trigger"
              >
                <div className={styles['ams-user-menu-header']}>
                  <p className={styles['ams-user-menu-name']}>{displayUsername}</p>
                  <p className={styles['ams-user-menu-role']}>{displayRoleLabel}</p>
                </div>
                <div className={styles['ams-user-menu-body']}>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles['ams-user-menu-item']}
                    onClick={() => {
                      navigate('/profile');
                      setUserMenuOpen(false);
                    }}
                  >
                    <User size={15} />
                    <span>{t('header.profile')}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles['ams-user-menu-item']}
                    onClick={handleLogout}
                  >
                    <LogOut size={15} />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className={styles['ams-main']}>
          <Suspense
            fallback={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid rgba(99, 102, 241, 0.15)', borderTopColor: 'var(--nm-primary, #6366f1)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Chatbot — always rendered, logic unchanged */}
      <Chatbot />

      {/* ── 403 Forbidden Toasts ─────────────────────────────────────────── */}
      {forbiddenToasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            pointerEvents: 'none',
          }}
        >
          {forbiddenToasts.map((t) => (
            <div
              key={t.id}
              style={{
                background: 'var(--nm-surface)',
                borderLeft: '4px solid var(--nm-danger)',
                borderRadius: 'var(--nm-radius-md)',
                boxShadow: '6px 6px 20px rgba(0,0,0,0.18), -4px -4px 12px rgba(255,255,255,0.7)',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontFamily: 'var(--font-primary)',
                fontSize: 'var(--fs-sm)',
                color: 'var(--nm-text)',
                minWidth: '280px',
                animation: 'slideInRight 0.3s ease',
                pointerEvents: 'all',
              }}
            >
              <span style={{ color: 'var(--nm-danger)', fontWeight: 'bold', fontSize: '18px' }}>⚠</span>
              <span><strong>Từ chối truy cập (403)</strong><br />{t.message}</span>
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
