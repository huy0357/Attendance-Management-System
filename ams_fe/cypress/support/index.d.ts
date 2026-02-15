/// <reference types="cypress" />

import type { AuthTokens } from './commands';

declare global {
  namespace Cypress {
    interface Chainable {
      dangNhapBangApi(): Chainable<AuthTokens>;
      thamTrangCoAuth(path: string, tokens?: AuthTokens): Chainable<void>;
    }
  }
}

export {};
