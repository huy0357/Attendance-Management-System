import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { tokenStorage } from '../api/axiosInstance';

// ── Mock axios ────────────────────────────────────────────────────────────────
vi.mock('../api/axiosInstance', async () => {
  const actual = await vi.importActual<typeof import('../api/axiosInstance')>(
    '../api/axiosInstance',
  );
  return {
    ...actual,
    default: {
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
  };
});

import axiosInstance from '../api/axiosInstance';
const mockPost = axiosInstance.post as ReturnType<typeof vi.fn>;

// ── Test component using the hook ─────────────────────────────────────────────
const TestComponent = () => {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="username">{auth.username ?? 'null'}</span>
      <span data-testid="role">{auth.role ?? 'null'}</span>
      <span data-testid="normalized-role">{auth.getNormalizedRole() ?? 'null'}</span>
      <button onClick={() => auth.login({ username: 'admin', password: 'pass' })}>Login</button>
      <button onClick={() => auth.logout()}>Logout</button>
    </div>
  );
};

const renderWithAuth = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    </MemoryRouter>,
  );

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts unauthenticated when no token in storage', () => {
    renderWithAuth();
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('username').textContent).toBe('null');
  });

  it('starts authenticated when valid (non-expired) token already in localStorage', () => {
    // Build a fake JWT with exp = far future
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ exp: futureExp, employeeId: 1 }));
    const fakeToken = `header.${payload}.sig`;
    localStorage.setItem('ams.accessToken', fakeToken);
    localStorage.setItem('ams.username', 'testuser');
    localStorage.setItem('ams.role', 'ROLE_ADMIN');

    renderWithAuth();
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('username').textContent).toBe('testuser');
  });

  it('login() stores tokens and sets authenticated state', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          tokenType: 'Bearer',
          expiresInSeconds: 3600,
          username: 'admin',
          role: 'ROLE_ADMIN',
        },
        message: 'OK',
        timestamp: new Date().toISOString(),
      },
    });

    renderWithAuth();
    await act(async () => {
      await user.click(screen.getByText('Login'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('username').textContent).toBe('admin');
    });

    expect(localStorage.getItem('ams.accessToken')).toBe('access-token');
    expect(localStorage.getItem('ams.username')).toBe('admin');
    expect(localStorage.getItem('ams.role')).toBe('ROLE_ADMIN');
  });

  it('logout() clears tokens and sets unauthenticated', async () => {
    const user = userEvent.setup();
    // Pre-fill auth state
    localStorage.setItem('ams.accessToken', 'token');
    localStorage.setItem('ams.refreshToken', 'refresh');
    localStorage.setItem('ams.username', 'admin');
    localStorage.setItem('ams.role', 'ROLE_ADMIN');

    mockPost.mockResolvedValueOnce({ data: { success: true } });

    renderWithAuth();
    await act(async () => {
      await user.click(screen.getByText('Logout'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
    });

    expect(localStorage.getItem('ams.accessToken')).toBeNull();
  });

  it('getNormalizedRole() strips ROLE_ prefix and uppercases', () => {
    localStorage.setItem('ams.role', 'ROLE_EMPLOYEE');
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ exp: futureExp }));
    localStorage.setItem('ams.accessToken', `h.${payload}.s`);

    renderWithAuth();
    expect(screen.getByTestId('normalized-role').textContent).toBe('EMPLOYEE');
  });

  it('tokenStorage.store() persists all fields correctly', () => {
    tokenStorage.store({
      accessToken: 'at',
      refreshToken: 'rt',
      username: 'u1',
      role: 'ROLE_ADMIN',
      expiresInSeconds: 600,
    });

    expect(localStorage.getItem('ams.accessToken')).toBe('at');
    expect(localStorage.getItem('ams.refreshToken')).toBe('rt');
    expect(localStorage.getItem('ams.username')).toBe('u1');
    expect(localStorage.getItem('ams.role')).toBe('ROLE_ADMIN');
    expect(localStorage.getItem('ams.expiresAt')).toBeTruthy();
  });

  it('tokenStorage.clear() removes all ams.* keys', () => {
    tokenStorage.store({
      accessToken: 'at',
      refreshToken: 'rt',
      username: 'u',
      role: 'ROLE_ADMIN',
      expiresInSeconds: 300,
    });
    tokenStorage.clear();

    expect(localStorage.getItem('ams.accessToken')).toBeNull();
    expect(localStorage.getItem('ams.refreshToken')).toBeNull();
    expect(localStorage.getItem('ams.username')).toBeNull();
    expect(localStorage.getItem('ams.role')).toBeNull();
    expect(localStorage.getItem('ams.expiresAt')).toBeNull();
  });
});
