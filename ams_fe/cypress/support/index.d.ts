declare namespace Cypress {
  interface Chainable {
    login(): Chainable<void>;
    waitForOverlayToDisappear(): Chainable<void>;
  }
}
