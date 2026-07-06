/**
 * AuthContext Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { tokenMemory, cookieStorage } from '../api/axiosInstance';

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

// ── Test Component ─────────────────────────────────────────────────────────────
const TestComponent = () => {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="initializing">{String(auth.isInitializing)}</span>
      <span data-testid="username">{auth.username ?? 'null'}</span>
      <span data-testid="role">{auth.role ?? 'null'}</span>
      <span data-testid="normalized-role">
        {auth.getNormalizedRole() ?? 'null'}
      </span>
      <button onClick={() => auth.login({ username: 'admin', password: 'pass' })}>
        Login
      </button>
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

// ── Test Suite ─────────────────────────────────────────────────────────────────
describe('AuthContext', () => {
  beforeEach(() => {
    tokenMemory.clear();
    cookieStorage.clearRefreshToken();
    vi.clearAllMocks();
  });

  afterEach(() => {
    tokenMemory.clear();
    cookieStorage.clearRefreshToken();
  });

  // ── Session Restoration (On Mount) ───────────────────────────────────────────

  it('shows loading state and restores session successfully if cookie is valid', async () => {
    cookieStorage.setRefreshToken('some-refresh-token');

    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          accessToken: 'restored-token',
          refreshToken: 'new-refresh-token',
          tokenType: 'Bearer',
          expiresInSeconds: 3600,
          username: 'restored_user',
          role: 'ROLE_EMPLOYEE',
        },
        message: 'OK',
        timestamp: new Date().toISOString(),
      },
    });

    renderWithAuth();

    expect(screen.getByText('Restoring session...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Restoring session...')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('username').textContent).toBe('restored_user');
    expect(screen.getByTestId('initializing').textContent).toBe('false');

    expect(tokenMemory.getAccessToken()).toBe('restored-token');
    expect(cookieStorage.getRefreshToken()).toBe('new-refresh-token');
  });

  it('shows loading state and sets unauthenticated if cookie is missing/invalid', async () => {
    cookieStorage.setRefreshToken('bad-refresh-token');
    mockPost.mockRejectedValueOnce(new Error('Unauthorized'));

    renderWithAuth();

    await waitFor(() => {
      expect(screen.queryByText('Restoring session...')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('initializing').textContent).toBe('false');
    
    expect(tokenMemory.getAccessToken()).toBeNull();
  });

  it('skips refresh call if already authenticated in memory', async () => {
    tokenMemory.store({
      accessToken: 'existing-valid-token',
      username: 'testuser',
      role: 'ROLE_ADMIN',
      expiresInSeconds: 3600,
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.queryByText('Restoring session...')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('username').textContent).toBe('testuser');

    expect(mockPost).not.toHaveBeenCalled();
  });


  // ── login() ────────────────────────────────────────────────────────────────

  it('login() stores tokens in memory and sets authenticated state', async () => {
    const user = userEvent.setup();
    
    renderWithAuth();

    await waitFor(() => {
      expect(screen.queryByText('Restoring session...')).not.toBeInTheDocument();
    });

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

    await act(async () => {
      await user.click(screen.getByText('Login'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('username').textContent).toBe('admin');
    });

    expect(tokenMemory.getAccessToken()).toBe('access-token');
    expect(cookieStorage.getRefreshToken()).toBe('refresh-token');
  });

  // ── logout() ──────────────────────────────────────────────────────────────

  it('logout() clears tokenMemory and cookie and sets unauthenticated', async () => {
    cookieStorage.setRefreshToken('existing-refresh-token');
    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          accessToken: 'existing-token',
          refreshToken: 'refresh-token',
          username: 'admin',
          role: 'ROLE_ADMIN',
          expiresInSeconds: 3600,
        }
      }
    });

    const user = userEvent.setup();
    renderWithAuth();
    
    await waitFor(() => {
      expect(screen.queryByText('Restoring session...')).not.toBeInTheDocument();
    });

    mockPost.mockResolvedValueOnce({ data: { success: true } });

    await act(async () => {
      await user.click(screen.getByText('Logout'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
    });

    expect(tokenMemory.getAccessToken()).toBeNull();
    expect(cookieStorage.getRefreshToken()).toBeNull();
  });
});
