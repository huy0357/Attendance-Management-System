import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export type AppRole = 'ADMIN' | 'EMPLOYEE';

interface RoleRouteProps {
  /** Allowed role strings — normalized comparison (case-insensitive, strips ROLE_ prefix) */
  allowedRoles: AppRole[];
  /** Where to redirect if role check fails. Default: /dashboard */
  redirectTo?: string;
}

/**
 * Replaces Angular RoleGuard.
 * Wrap any route that requires a specific role.
 * Users without the required role are redirected (default: /dashboard).
 */
const RoleRoute: React.FC<RoleRouteProps> = ({
  allowedRoles,
  redirectTo = '/dashboard',
}) => {
  const { hasAnyRole } = useAuth();

  if (allowedRoles.length === 0 || hasAnyRole(allowedRoles)) {
    return <Outlet />;
  }

  return <Navigate to={redirectTo} replace />;
};

export default RoleRoute;
