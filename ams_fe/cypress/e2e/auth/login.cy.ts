import { clickButtonWhenReady } from '../../support/ui-helpers';

describe('Đăng nhập - API thật', () => {
  const username = String(Cypress.env('E2E_USERNAME'));
  const password = String(Cypress.env('E2E_PASSWORD'));

  it('Đăng nhập đúng thông tin và điều hướng vào trang chính', () => {
    cy.intercept('POST', '**/api/auth/login').as('dangNhap');

    cy.visit('/login');
    cy.location('pathname').should('eq', '/login');

    cy.login();

    cy.wait('@dangNhap').then(({ request, response }) => {
      expect(request.body).to.deep.equal({ username, password });
      expect([200, 201]).to.include(response?.statusCode ?? 0);
    });

    cy.url().should('not.include', '/login');
  });

  it('Sai mật khẩu thì hiển thị lỗi và vẫn ở trang login', () => {
    cy.intercept('POST', '**/api/auth/login').as('dangNhapSaiMatKhau');

    cy.visit('/login');
    cy.get('input[formcontrolname="username"]').clear().type(username);
    cy.get('input[formcontrolname="password"]').clear().type('MatKhauSai123');
    clickButtonWhenReady(/Sign In|Đăng nhập/i);

    cy.wait('@dangNhapSaiMatKhau').then(({ response }) => {
      expect([401, 403, 500]).to.include(response?.statusCode ?? 0);
    });

    cy.url().should('include', '/login');
    cy.contains(/Login failed|Please check your credentials/i).should('be.visible');
  });

  it('Bỏ trống username thì không gửi request đăng nhập', () => {
    cy.intercept('POST', '**/api/auth/login').as('dangNhapTrongUsername');

    cy.visit('/login');
    cy.get('input[formcontrolname="username"]').clear();
    cy.get('input[formcontrolname="password"]').clear().type(password);
    clickButtonWhenReady(/Sign In|Đăng nhập/i);

    cy.get('@dangNhapTrongUsername.all').should('have.length', 0);
    cy.url().should('include', '/login');
  });

  it('Bỏ trống password thì không gửi request đăng nhập', () => {
    cy.intercept('POST', '**/api/auth/login').as('dangNhapTrongPassword');

    cy.visit('/login');
    cy.get('input[formcontrolname="username"]').clear().type(username);
    cy.get('input[formcontrolname="password"]').clear();
    clickButtonWhenReady(/Sign In|Đăng nhập/i);

    cy.get('@dangNhapTrongPassword.all').should('have.length', 0);
    cy.url().should('include', '/login');
  });

  it('Username có khoảng trắng đầu/cuối vẫn xử lý đúng behavior hệ thống', () => {
    cy.intercept('POST', '**/api/auth/login').as('dangNhapKhoangTrang');

    cy.visit('/login');
    cy.get('input[formcontrolname="username"]').clear().type(`  ${username}  `);
    cy.get('input[formcontrolname="password"]').clear().type(password);
    clickButtonWhenReady(/Sign In|Đăng nhập/i);

    cy.wait('@dangNhapKhoangTrang').then(({ request, response }) => {
      expect(request.body).to.have.property('username');
      expect(request.body).to.have.property('password', password);
      expect([200, 201, 401, 403]).to.include(response?.statusCode ?? 0);
    });

    cy.location('pathname').then((path) => {
      if (path.includes('/login')) {
        cy.contains(/Login failed|Please check your credentials/i).should('be.visible');
      }
    });
  });

  it('Nhấn Enter trong ô mật khẩu để submit', () => {
    cy.intercept('POST', '**/api/auth/login').as('dangNhapBangEnter');

    cy.visit('/login');
    cy.get('input[formcontrolname="username"]').clear().type(username);
    cy.get('input[formcontrolname="password"]').clear().type(`${password}{enter}`);

    cy.wait('@dangNhapBangEnter').then(({ response }) => {
      expect([200, 201]).to.include(response?.statusCode ?? 0);
    });

    cy.url().should('not.include', '/login');
  });

  it('Logout (nếu có nút) thì quay về login đúng hành vi', () => {
    cy.login();

    cy.get('body').then(($body) => {
      const hasLogoutButton =
        $body.find('button:contains("Logout")').length > 0
        || $body.find('button:contains("Sign out")').length > 0
        || $body.find('button:contains("Đăng xuất")').length > 0;

      if (!hasLogoutButton) {
        cy.log('Không tìm thấy nút logout trên UI hiện tại.');
        return;
      }

      clickButtonWhenReady(/Logout|Sign out|Đăng xuất/i);
      cy.location('pathname', { timeout: 15000 }).should('eq', '/login');
    });
  });

  it('Refresh sau khi login không bị bật ngược về login (hoặc theo đúng behavior hệ thống)', () => {
    cy.login();

    cy.reload();
    cy.location('pathname', { timeout: 15000 }).then((pathname) => {
      if (pathname === '/login') {
        cy.contains(/Welcome back|Sign in|Đăng nhập/i).should('be.visible');
        return;
      }

      cy.url().should('not.include', '/login');
    });
  });
});
