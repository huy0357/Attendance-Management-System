import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import { AuthContext } from './AuthContext';

// ── Mock AuthContext values ───────────────────────────────────────────────────
const makeAuth = (overrides: Partial<{
  isInitializing: boolean;
  isAuthenticated: boolean;
  hasAnyRole: (roles: string[]) => boolean;
}>) => ({
  isInitializing: false,
  isAuthenticated: false,
  username: null,
  role: null,
  login: vi.fn(),
  logout: vi.fn(),
  forgotPassword: vi.fn(),
  verifyOtp: vi.fn(),
  resetPassword: vi.fn(),
  hasRole: vi.fn(() => false),
  hasAnyRole: vi.fn(() => false),
  getNormalizedRole: vi.fn(() => null),
  getEmployeeId: vi.fn(() => null),
  ...overrides,
});

const renderWithMemoryRouter = (
  authValue: ReturnType<typeof makeAuth>,
  initialEntry: string,
  element: React.ReactNode,
) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
          <Route element={element}>
            <Route path="/" element={<div data-testid="protected-content">Protected</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders children when user is authenticated', () => {
    const auth = makeAuth({ isAuthenticated: true });
    renderWithMemoryRouter(auth, '/', <ProtectedRoute />);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects to /login when user is NOT authenticated', () => {
    const auth = makeAuth({ isAuthenticated: false });
    renderWithMemoryRouter(auth, '/', <ProtectedRoute />);
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });
});

describe('RoleRoute', () => {
  it('renders children when user has the required role', () => {
    const auth = makeAuth({
      isAuthenticated: true,
      hasAnyRole: (roles) => roles.includes('ADMIN'),
    });
    renderWithMemoryRouter(auth, '/', <RoleRoute allowedRoles={['ADMIN']} />);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects to /dashboard when user does NOT have the required role', () => {
    const auth = makeAuth({
      isAuthenticated: true,
      hasAnyRole: () => false,
    });
    renderWithMemoryRouter(auth, '/', <RoleRoute allowedRoles={['ADMIN']} redirectTo="/dashboard" />);
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  it('allows all users when allowedRoles is empty', () => {
    const auth = makeAuth({ isAuthenticated: true });
    renderWithMemoryRouter(auth, '/', <RoleRoute allowedRoles={[]} />);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
});
