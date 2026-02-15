/// <reference types="cypress" />

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresInSeconds?: number;
  username?: string;
  role?: string;
};

const getRequiredEnv = (key: string): string => {
  const value = Cypress.env(key);
  if (!value || typeof value !== 'string') {
    throw new Error(`Missing required Cypress env: ${key}`);
  }
  return value;
};

const setAuthStorage = (win: Window, tokens: AuthTokens): void => {
  win.localStorage.setItem('ams.accessToken', tokens.accessToken);
  win.localStorage.setItem('ams.refreshToken', tokens.refreshToken);
  if (tokens.username) {
    win.localStorage.setItem('ams.username', tokens.username);
  }
  if (tokens.role) {
    win.localStorage.setItem('ams.role', tokens.role);
  }
  if (tokens.expiresInSeconds && tokens.expiresInSeconds > 0) {
    const expiresAt = Date.now() + tokens.expiresInSeconds * 1000;
    win.localStorage.setItem('ams.expiresAt', String(expiresAt));
  }
};

Cypress.Commands.add('dangNhapBangApi', () => {
  const apiUrl = getRequiredEnv('API_URL');
  const username = getRequiredEnv('E2E_USERNAME');
  const password = getRequiredEnv('E2E_PASSWORD');

  return cy
    .request({
      method: 'POST',
      url: `${apiUrl}/api/auth/login`,
      body: { username, password },
      failOnStatusCode: false,
    })
    .then((response) => {
      expect(response.status, 'login status').to.eq(200);
      const body = response.body || {};
      const tokens: AuthTokens = {
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        tokenType: body.tokenType,
        expiresInSeconds: body.expiresInSeconds,
        username: body.username,
        role: body.role,
      };

      if (!tokens.accessToken || !tokens.refreshToken) {
        throw new Error('Login response missing accessToken/refreshToken');
      }

      Cypress.env('authTokens', tokens);
      return tokens;
    });
});

Cypress.Commands.add('thamTrangCoAuth', (path: string, tokens?: AuthTokens) => {
  const authTokens = tokens || (Cypress.env('authTokens') as AuthTokens | undefined);
  if (!authTokens) {
    throw new Error('Thiếu auth tokens. Hãy gọi dangNhapBangApi() hoặc truyền tokens vào.');
  }

  cy.visit(path, {
    onBeforeLoad(win) {
      setAuthStorage(win, authTokens);
    },
  });
});
