export function waitForOverlay(): void {
  cy.get("body").then(($body) => {
    if ($body.find("div.fixed.inset-0").length === 0) {
      return;
    }

    cy.get("div.fixed.inset-0", { timeout: 15000 }).should("not.exist");
  });
}

export function clickButtonWhenReady(label: string | RegExp): void {
  waitForOverlay();
  cy.contains("button", label).should("be.visible").click();
}

export function clickFirstWhenReady(selector: string): void {
  waitForOverlay();
  cy.get(selector).first().should("be.visible").click();
}

/**
 * Special helper to click buttons inside a modal.
 * Using this prevents `waitForOverlay()` from deadlocking,
 * because the overlay it waits for IS the modal's own backdrop.
 */
export function clickModalButtonWhenReady(label: string | RegExp): void {
  cy.contains("button", label).should("be.visible").click();
}
