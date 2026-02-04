/// <reference types="cypress" />

/**
 * Custom Cypress commands for AMS E2E tests
 */

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to clear auth state (localStorage)
       */
      clearAuthState(): Chainable<void>;

      /**
       * Custom command to login with given credentials
       */
      login(username: string, password: string): Chainable<void>;

      /**
       * Custom command to logout (clear storage and navigate to login)
       */
      logout(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('clearAuthState', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('access_token');
    win.localStorage.removeItem('refresh_token');
    win.localStorage.removeItem('user');
  });
});

Cypress.Commands.add('login', (username: string, password: string) => {
  cy.visit('/auth/login');
  cy.get('#username').clear().type(username);
  cy.get('#password').clear().type(password);
  cy.get('button[type="submit"]').click();
});

Cypress.Commands.add('logout', () => {
  cy.clearAuthState();
  cy.visit('/auth/login');
});

export {};
