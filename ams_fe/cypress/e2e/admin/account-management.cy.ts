import { assertRequestQuery } from '../../support/request-assertions';
import { clickButtonWhenReady, clickModalButtonWhenReady } from '../../support/ui-helpers';

describe('Admin - Account Management (real API, no mock)', () => {
  beforeEach(() => {
    cy.login();
  });

  const openAccountManagementPage = () => {
    cy.intercept('GET', '**/api/accounts/page**').as('loadAccountsPage');

    cy.visit('/admin/account-management');
    cy.location('pathname').should('include', '/admin/account-management');
    cy.wait('@loadAccountsPage');
  };

  it('loads account management page successfully', () => {
    openAccountManagementPage();

    cy.contains('Account Management').should('be.visible');
  });

  it('keeps route and calls API again after reload', () => {
    openAccountManagementPage();

    cy.reload();
    cy.wait('@loadAccountsPage').then(({ response }) => {
      expect([200, 204, 403, 500]).to.include(response?.statusCode ?? 0);
    });

    cy.location('pathname').should('include', '/admin/account-management');
  });

  it('search sends /search request with username query', () => {
    openAccountManagementPage();
    cy.intercept('GET', '**/api/accounts/search**').as('searchAccounts');

    cy.get('input[placeholder="Search by username..."]').clear().type('admin');
    cy.wait('@searchAccounts').then(({ request, response }) => {
      assertRequestQuery(request.query, {
        username: 'admin',
        page: /\d+/,
      });
      expect([200, 204, 403, 500]).to.include(response?.statusCode ?? 0);
    });
  });

  it('search with special characters does not crash the page', () => {
    openAccountManagementPage();
    cy.intercept('GET', '**/api/accounts/search**').as('searchAccounts');

    cy.get('input[placeholder="Search by username..."]').clear().type('dang@#');
    cy.wait('@searchAccounts').then(({ request }) => {
      expect(request.query).to.have.property('username');
    });

    cy.contains('Account Management').should('be.visible');
  });

  it('role filter works in UI without breaking layout', () => {
    openAccountManagementPage();

    cy.get('select').first().select('admin');
    cy.contains('Account Management').should('be.visible');

    cy.get('select').first().select('employee');
    cy.contains('Account Management').should('be.visible');

    cy.get('select').first().select('all');
  });

  it('status filter sends correct isActive query', () => {
    openAccountManagementPage();

    cy.get('select').eq(1).select('inactive');
    cy.wait('@loadAccountsPage').then(({ request }) => {
      assertRequestQuery(request.query, { isActive: 'false' });
    });

    cy.get('select').eq(1).select('active');
    cy.wait('@loadAccountsPage').then(({ request }) => {
      assertRequestQuery(request.query, { isActive: 'true' });
    });

    cy.get('select').eq(1).select('all');
    cy.wait('@loadAccountsPage').then(({ request }) => {
      expect(request.query.isActive).to.eq(undefined);
    });
  });

  it('required validation blocks POST when username/password are empty', () => {
    openAccountManagementPage();
    cy.intercept('POST', '**/api/accounts').as('createAccount');

    clickButtonWhenReady('Add User');
    cy.contains('Add New User').should('be.visible');

    cy.get('input[formcontrolname="username"]').clear();
    cy.get('input[formcontrolname="password"]').clear();
    cy.contains('button', 'Create User').should('be.disabled');

    cy.get('@createAccount.all').should('have.length', 0);
  });

  it('cancel in create modal does not send POST', () => {
    openAccountManagementPage();
    cy.intercept('POST', '**/api/accounts').as('createAccount');

    clickButtonWhenReady('Add User');

    cy.get('input[formcontrolname="username"]').type(`acc-${Date.now()}`);
    cy.get('input[formcontrolname="password"]').type('secret1');
    clickModalButtonWhenReady('Cancel');

    cy.contains('Add New User').should('not.exist');
    cy.get('@createAccount.all').should('have.length', 0);
  });

  it('403 or 500 does not force logout and session stays intact', () => {
    cy.intercept('GET', '**/api/accounts/page**').as('loadAccountsPage');

    cy.visit('/admin/account-management');
    cy.wait('@loadAccountsPage').then(({ response }) => {
      const status = response?.statusCode ?? 0;

      if (status === 403) {
        cy.contains('Unable to load account data. Please try again.').should('be.visible');
      }

      if (status >= 500) {
        cy.contains('Account Management').should('be.visible');
      }

      cy.url().should('not.include', '/login');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('ams.accessToken')).to.be.a('string').and.not.be.empty;
      });
    });
  });
});
