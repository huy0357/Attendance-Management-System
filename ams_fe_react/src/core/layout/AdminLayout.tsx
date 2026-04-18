import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  Search,
  Bell,
  Menu,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useSettings } from '../../shared/hooks/useSettings';
import Chatbot from '../../features/chatbot/components/Chatbot';
import styles from './AdminLayout.module.scss';
import { cn } from '../../shared/utils/cn';

// ── Nav item definition ───────────────────────────────────────────────────────
interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  requiredRoles?: string[];
  activeMatchPaths?: string[];
}

const ICON_SIZE = { size: 17, strokeWidth: 2 } as const;

// Mirrors admin-layout.component.ts navItems[] exactly
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard {...ICON_SIZE} />,
  },
  {
    label: 'Employee Portal',
    path: '/hrm/employee-portal',
    icon: <User {...ICON_SIZE} />,
    requiredRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
  },
  {
    label: 'Attendance Daily',
    path: '/attendance/attendance-daily',
    icon: <Clock {...ICON_SIZE} />,
    requiredRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
    activeMatchPaths: [
      '/attendance/attendance-daily',
      '/attendance/attendance-daily/admin',
      '/attendance/attendance-daily/employee',
    ],
  },
  {
    label: 'Requests',
    path: '/attendance/requests-management',
    icon: <ClipboardCheck {...ICON_SIZE} />,
    requiredRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
  },
  {
    label: 'Employees',
    path: '/hrm/employees',
    icon: <Users {...ICON_SIZE} />,
    requiredRoles: ['ADMIN'],
  },
  {
    label: 'Departments',
    path: '/hrm/departments',
    icon: <Building {...ICON_SIZE} />,
    requiredRoles: ['ADMIN'],
  },
  {
    label: 'Contracts',
    path: '/hrm/contracts',
    icon: <ClipboardCheck {...ICON_SIZE} />,
    requiredRoles: ['ADMIN'],
  },
  {
    label: 'Payroll',
    path: '/payroll',
    icon: <ClipboardList {...ICON_SIZE} />,
    requiredRoles: ['ADMIN'],
  },
  {
    label: 'Scheduling',
    path: '/attendance/scheduling',
    icon: <Calendar {...ICON_SIZE} />,
    requiredRoles: ['ADMIN'],
  },
  {
    label: 'Shift Templates',
    path: '/attendance/shift-templates',
    icon: <Calendar {...ICON_SIZE} />,
    requiredRoles: ['ADMIN'],
  },
  {
    label: 'Attend. Email',
    path: '/attendance/attendance-email',
    icon: <Mail {...ICON_SIZE} />,
    requiredRoles: ['ADMIN'],
  },
  {
    label: 'OT Requests',
    path: '/attendance/ot-requests',
    icon: <Clock {...ICON_SIZE} />,
    requiredRoles: ['MANAGER', 'ADMIN'],
  },
  {
    label: 'Accounts',
    path: '/admin/account-management',
    icon: <Users {...ICON_SIZE} />,
    requiredRoles: ['ADMIN'],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: <ClipboardList {...ICON_SIZE} />,
    requiredRoles: ['ADMIN'],
  },
  {
    label: 'Audit Logs',
    path: '/admin/audit-log',
    icon: <ClipboardList {...ICON_SIZE} />,
    requiredRoles: ['ADMIN'],
  },
  {
    label: 'Settings',
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

function getRoleLabel(normalizedRole: string | null): string {
  switch (normalizedRole) {
    case 'ADMIN':
      return 'System Administrator';
    case 'MANAGER':
      return 'Manager';
    case 'EMPLOYEE':
      return 'Employee';
    default:
      return normalizedRole ?? 'Authenticated User';
  }
}

// ── Page Spinner fallback ─────────────────────────────────────────────────────


// ── Component ─────────────────────────────────────────────────────────────────
const AdminLayout: React.FC = () => {
  const { username, hasAnyRole, getNormalizedRole, logout, isAuthenticated } = useAuth();
  const { compactSidebar } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayUsername = username ?? 'User';
  const normalizedRole = getNormalizedRole();
  const displayRoleLabel = getRoleLabel(normalizedRole);
  const displayInitials = getDisplayInitials(displayUsername);

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.requiredRoles || item.requiredRoles.length === 0) return isAuthenticated;
    return hasAnyRole(item.requiredRoles);
  });

  const resolveNavPath = useCallback(
    (item: NavItem): string => {
      if (item.path === '/attendance/attendance-daily') {
        return hasAnyRole(['ADMIN'])
          ? '/attendance/attendance-daily/admin'
          : '/attendance/attendance-daily';
      }
      return item.path;
    },
    [hasAnyRole],
  );

  const isActive = useCallback(
    (item: NavItem): boolean => {
      const matchPaths =
        item.activeMatchPaths && item.activeMatchPaths.length > 0
          ? item.activeMatchPaths
          : [resolveNavPath(item)];
      return matchPaths.some(
        (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
      );
    },
    [location.pathname, resolveNavPath],
  );

  // Close user menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

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

        {/* Section label */}
        <span className={styles['ams-nav-section-label']}>Navigation</span>

        {/* Nav */}
        <nav ref={navRef} className={styles['ams-nav']}>
          {visibleNavItems.map((item) => {
            const active = isActive(item);
            return (
              <NavLink
                key={item.path}
                to={resolveNavPath(item)}
                className={cn(
                  styles['ams-nav-link'],
                  active ? styles['ams-nav-link--active'] : '',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles['ams-nav-icon']}>{item.icon}</span>
                <span className={styles['ams-nav-label']}>{item.label}</span>
                {active && (
                  <ChevronRight
                    size={13}
                    strokeWidth={3}
                    className={styles['ams-nav-chevron']}
                  />
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content wrapper ─────────────────────────────────────────── */}
      <div className={styles['ams-content-wrap']}>
        {/* Header */}
        <header className={styles['ams-header']}>
          <div className={styles['ams-header-left']}>
            {/* Mobile menu toggle (visual only — compact mode handled by useSettings) */}
            <button
              className={styles['ams-menu-toggle']}
              aria-label="Toggle navigation"
              type="button"
            >
              <Menu size={18} />
            </button>

            {/* Search — inset Neumorphism */}
            <div className={styles['ams-search-wrap']}>
              <Search size={15} className={styles['ams-search-icon']} />
              <input
                type="search"
                id="ams-global-search"
                placeholder="Search…"
                className={styles['ams-search-input']}
                aria-label="Global search"
              />
            </div>
          </div>

          {/* Right side: bell + avatar */}
          <div className={styles['ams-header-right']} ref={menuRef}>
            {/* Notification bell */}
            <button
              className={styles['ams-icon-btn']}
              aria-label="Notifications"
              type="button"
            >
              <Bell size={17} />
              <span className={styles['ams-notif-dot']} aria-hidden="true" />
            </button>

            {/* Avatar / user menu */}
            <button
              id="ams-user-menu-trigger"
              type="button"
              className={styles['ams-avatar-btn']}
              onClick={() => setUserMenuOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
              aria-label="User menu"
            >
              <div className={styles['ams-avatar']}>
                <span className={styles['ams-avatar-initials']}>{displayInitials}</span>
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
                    <span>Profile</span>
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
          <Outlet />
        </main>
      </div>

      {/* Chatbot — always rendered, logic unchanged */}
      <Chatbot />
    </div>
  );
};

export default AdminLayout;
