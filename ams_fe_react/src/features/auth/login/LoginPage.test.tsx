import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../../../core/auth/AuthContext';
import LoginPage from './LoginPage';

const makeAuth = (overrides?: Partial<{
  login: () => Promise<unknown>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ message: string }>;
  resetPassword: (email: string, otp: string, pw: string) => Promise<{ message: string }>;
}>) => ({
  isAuthenticated: false,
  username: null,
  role: null,
  login: vi.fn().mockResolvedValue({}),
  logout: vi.fn(),
  forgotPassword: vi.fn().mockResolvedValue({ message: 'OTP sent' }),
  verifyOtp: vi.fn().mockResolvedValue({ message: 'OTP verified' }),
  resetPassword: vi.fn().mockResolvedValue({ message: 'Password reset' }),
  hasRole: vi.fn(() => false),
  hasAnyRole: vi.fn(() => false),
  getNormalizedRole: vi.fn(() => null),
  getEmployeeId: vi.fn(() => null),
  ...overrides,
});

const renderLogin = (authOverrides?: Parameters<typeof makeAuth>[0]) => {
  const auth = makeAuth(authOverrides);
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return auth;
};

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the login form with all elements', () => {
    renderLogin();
    expect(screen.getByText('AMS Core')).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByText('Remember me')).toBeInTheDocument();
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls auth.login with correct credentials when form is submitted', async () => {
    const user = userEvent.setup();
    const auth = renderLogin();

    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'password123',
      });
    });
  });

  it('shows error message when login fails', async () => {
    const user = userEvent.setup();
    renderLogin({
      login: vi.fn().mockRejectedValue(new Error('Invalid credentials')),
    });

    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/^password$/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
    });
  });

  it('switches to forgot password mode when link is clicked', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByText('Forgot password?'));

    expect(screen.getByText('Forgot password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send otp/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
  });

  it('sends OTP and switches to verify mode', async () => {
    const user = userEvent.setup();
    const auth = renderLogin();

    await user.click(screen.getByText('Forgot password?'));
    await user.clear(screen.getByLabelText(/account email/i));
    await user.type(screen.getByLabelText(/account email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send otp/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Verify OTP' })).toBeInTheDocument();
    });
    expect(auth.forgotPassword).toHaveBeenCalledWith('test@example.com');
  });

  it('returns to login mode when Back to Login is clicked', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByText('Forgot password?'));
    expect(screen.getByText('Forgot password')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to login/i }));
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
