import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

/** All normalized roles in the system (mirrors backend ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE) */
export type AppRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

interface RoleRouteProps {
  /** Allowed role strings — normalized comparison (case-insensitive, strips ROLE_ prefix) */
  allowedRoles: AppRole[];
  /** Where to redirect if role check fails.
   *  Default: /hrm/employee-portal (safe landing for EMPLOYEE — avoids /dashboard redirect loop)
   */
  redirectTo?: string;
}

/**
 * Replaces Angular RoleGuard.
 * Wrap any route that requires a specific role.
 * Users without the required role are redirected (default: /dashboard).
 *
 * Usage:
 *   <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
 *     <Route path="/ot-requests" element={<OtRequestsPage />} />
 *   </Route>
 */
const RoleRoute: React.FC<RoleRouteProps> = ({
  allowedRoles,
  redirectTo = '/hrm/employee-portal',
}) => {
  const { hasAnyRole } = useAuth();

  if (allowedRoles.length === 0 || hasAnyRole(allowedRoles)) {
    return <Outlet />;
  }

  return <Navigate to={redirectTo} replace />;
};

export default RoleRoute;
