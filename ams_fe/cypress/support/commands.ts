import { waitForOverlay } from "./ui-helpers";

function getRequiredEnv(name: string): string {
  const value = Cypress.env(name);

  if (!value) {
    throw new Error(`Missing Cypress env variable: ${name}`);
  }

  return value;
}

function getInputByLabel(labelPattern: RegExp): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.contains("label", labelPattern).then(($label) => {
    const forId = $label.attr("for");
    if (forId) {
      return cy.get(`#${forId}`);
    }

    return cy.wrap($label).parent().find("input").first();
  });
}

function getInputWithFallback(
  selectors: string[],
  labelPattern: RegExp,
): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get("body").then(($body) => {
    const found = selectors.find((selector) => $body.find(selector).length > 0);
    if (found) {
      return cy.get(found).first();
    }

    return getInputByLabel(labelPattern);
  });
}

function clickSubmitWithFallback(): void {
  cy.get("body").then(($body) => {
    if ($body.find('button[type="submit"]').length > 0) {
      cy.get('button[type="submit"]').first().click();
      return;
    }

    if ($body.find("button").length > 0) {
      cy.contains("button", /\u0110\u0103ng nh\u1eadp|Dang nhap|Login|Sign in/i).click();
      return;
    }

    throw new Error("Submit button not found");
  });
}

function hasBlockingOverlay($body: JQuery<HTMLElement>): boolean {
  return $body.find('div.fixed.inset-0').length > 0;
}

Cypress.Commands.add("login", () => {
  const username = getRequiredEnv("E2E_USERNAME");
  const password = getRequiredEnv("E2E_PASSWORD");

  cy.visit("/login");
  cy.location("pathname").should("include", "/login");
  cy.get("body").then(($body) => {
    if (
      $body.text().includes("\u0110\u0103ng nh\u1eadp")
      || $body.text().includes("Dang nhap")
    ) {
      cy.contains(/\u0110\u0103ng nh\u1eadp|Dang nhap/i).should("be.visible");
      return;
    }

    cy.contains(/Welcome back|Sign in|Login/i).should("be.visible");
  });

  getInputWithFallback(
    [
      'input[formcontrolname="username"]',
      'input[formcontrolname="email"]',
      "#username",
      "#email",
      'input[placeholder*="\u0054\u00e0\u0069\u0020\u006b\u0068\u006f\u1ea3\u006e"]',
      'input[placeholder*="Username"]',
      'input[placeholder*="Email"]',
    ],
    /\u0054\u00ea\u006e\u0020\u0111\u0103\u006e\u0067\u0020\u006e\u0068\u1eadp|Ten dang nhap|Username|Email/i,
  ).clear().type(username);

  getInputWithFallback(
    [
      'input[formcontrolname="password"]',
      "#password",
      'input[placeholder*="\u004d\u1ead\u0074\u0020\u006b\u0068\u1ea9\u0075"]',
      'input[placeholder*="Password"]',
    ],
    /\u004d\u1ead\u0074\u0020\u006b\u0068\u1ea9\u0075|Mat khau|Password/i,
  ).clear().type(password);

  clickSubmitWithFallback();

  cy.url().should("not.include", "/login");
});

Cypress.Commands.add("waitForOverlayToDisappear", () => {
  cy.get("body").then(($body) => {
    if (!hasBlockingOverlay($body)) {
      return;
    }
    waitForOverlay();
  });
});
