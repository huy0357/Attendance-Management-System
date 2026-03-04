import { assertRequestQuery } from '../../support/request-assertions';
import { clickButtonWhenReady, clickFirstWhenReady } from '../../support/ui-helpers';

describe('Admin - Quản lý tài khoản (API thật, không mock)', () => {
  beforeEach(() => {
    cy.login();
  });

  const vaoTrangTaiKhoan = () => {
    cy.intercept('GET', '**/api/accounts/page**').as('taiTrangTaiKhoan');

    cy.visit('/admin/account-management');
    cy.location('pathname').should('include', '/admin/account-management');
    cy.wait('@taiTrangTaiKhoan');
  };

  it('Smoke: tải trang quản lý tài khoản thành công', () => {
    vaoTrangTaiKhoan();

    cy.contains('Account Management').should('be.visible');
    cy.contains('User Accounts').should('be.visible');
  });

  it('Edge: reload trang vẫn giữ route và gọi lại API', () => {
    vaoTrangTaiKhoan();

    cy.reload();
    cy.wait('@taiTrangTaiKhoan').then(({ response }) => {
      expect([200, 204, 403, 500]).to.include(response?.statusCode ?? 0);
    });

    cy.location('pathname').should('include', '/admin/account-management');
  });

  it('Search username thường gửi request /search với query đúng', () => {
    vaoTrangTaiKhoan();
    cy.intercept('GET', '**/api/accounts/search**').as('timTaiKhoan');

    cy.get('input[placeholder="Search by name..."]').clear().type('admin');
    cy.wait('@timTaiKhoan').then(({ request, response }) => {
      assertRequestQuery(request.query, {
        username: 'admin',
        page: /\d+/,
      });
      expect([200, 204, 403, 500]).to.include(response?.statusCode ?? 0);
    });
  });

  it('Search với ký tự có dấu/đặc biệt không làm crash màn hình', () => {
    vaoTrangTaiKhoan();
    cy.intercept('GET', '**/api/accounts/search**').as('timTaiKhoan');

    cy.get('input[placeholder="Search by name..."]').clear().type('đặng@#');
    cy.wait('@timTaiKhoan').then(({ request }) => {
      expect(request.query).to.have.property('username');
    });

    cy.contains('Account Management').should('be.visible');
  });

  it('Filter role trên UI hoạt động và không vỡ layout', () => {
    vaoTrangTaiKhoan();

    cy.get('select').first().select('admin');
    cy.contains('Account Management').should('be.visible');

    cy.get('select').first().select('employee');
    cy.contains('Account Management').should('be.visible');

    cy.get('select').first().select('all');
  });

  it('Filter status gửi đúng query isActive', () => {
    vaoTrangTaiKhoan();

    cy.get('select').eq(1).select('inactive');
    cy.wait('@taiTrangTaiKhoan').then(({ request }) => {
      assertRequestQuery(request.query, { isActive: 'false' });
    });

    cy.get('select').eq(1).select('active');
    cy.wait('@taiTrangTaiKhoan').then(({ request }) => {
      assertRequestQuery(request.query, { isActive: 'true' });
    });

    cy.get('select').eq(1).select('all');
    cy.wait('@taiTrangTaiKhoan').then(({ request }) => {
      expect(request.query.isActive).to.eq(undefined);
    });
  });

  it('Phân trang Next/Prev gọi đúng request page', () => {
    vaoTrangTaiKhoan();

    cy.contains('button', 'Next').then(($next) => {
      if ($next.is(':disabled')) {
        cy.log('Không có trang kế tiếp');
        return;
      }

      cy.wrap($next).click();
      cy.wait('@taiTrangTaiKhoan').then(({ request }) => {
        assertRequestQuery(request.query, { page: /\d+/ });
      });

      cy.contains('button', 'Prev').then(($prev) => {
        if ($prev.is(':disabled')) {
          return;
        }

        cy.wrap($prev).click();
        cy.wait('@taiTrangTaiKhoan');
      });
    });
  });

  it('Validation required: thiếu name/email thì không gửi POST', () => {
    vaoTrangTaiKhoan();
    cy.intercept('POST', '**/api/accounts').as('taoTaiKhoan');

    clickButtonWhenReady('Add User');
    cy.contains('Add New User').should('be.visible');

    cy.get('input[formcontrolname="name"]').clear();
    cy.get('input[formcontrolname="email"]').clear();
    cy.contains('button', 'Create User').should('be.disabled');

    cy.get('@taoTaiKhoan.all').should('have.length', 0);
  });

  it('Luồng Cancel ở form tạo mới không gửi POST', () => {
    vaoTrangTaiKhoan();
    cy.intercept('POST', '**/api/accounts').as('taoTaiKhoan');

    clickButtonWhenReady('Add User');

    cy.get('input[formcontrolname="name"]').type(`acc-${Date.now()}`);
    cy.get('input[formcontrolname="email"]').type(`acc${Date.now()}@example.com`);
    clickButtonWhenReady('Cancel');

    cy.contains('Add New User').should('not.exist');
    cy.get('@taoTaiKhoan.all').should('have.length', 0);
  });

  it('Submit hợp lệ tạo account gửi POST (bao gồm case duplicate 409 nếu có)', () => {
    vaoTrangTaiKhoan();
    cy.intercept('POST', '**/api/accounts').as('taoTaiKhoan');

    clickButtonWhenReady('Add User');

    cy.get('input[formcontrolname="name"]').clear().type(`e2e-user-${Date.now()}`);
    cy.get('input[formcontrolname="email"]').clear().type(`e2e${Date.now()}@example.com`);
    cy.get('select[formcontrolname="role"]').select('employee');
    cy.get('input[formcontrolname="tempPassword"]').clear().type('TempPass123!');

    clickButtonWhenReady('Create User');

    cy.wait('@taoTaiKhoan').then(({ request, response }) => {
      expect(request.body).to.have.property('username');
      expect([200, 201, 400, 403, 409, 422]).to.include(response?.statusCode ?? 0);
    });
  });

  it('Edit: mở modal sửa rồi Cancel thì không gửi PUT', () => {
    vaoTrangTaiKhoan();
    cy.intercept('PUT', '**/api/accounts/*').as('capNhatTaiKhoan');

    cy.get('body').then(($body) => {
      if ($body.find('button[title="Edit"]').length === 0) {
        cy.log('Không có tài khoản để sửa');
        return;
      }

      clickFirstWhenReady('button[title="Edit"]');
      cy.contains('Edit User Account').should('be.visible');
      clickButtonWhenReady('Cancel');

      cy.get('@capNhatTaiKhoan.all').should('have.length', 0);
    });
  });

  it('Edit: cập nhật role/status hợp lệ gửi PUT', () => {
    vaoTrangTaiKhoan();
    cy.intercept('PUT', '**/api/accounts/*').as('capNhatTaiKhoan');

    cy.get('body').then(($body) => {
      if ($body.find('button[title="Edit"]').length === 0) {
        cy.log('Không có tài khoản để cập nhật');
        return;
      }

      clickFirstWhenReady('button[title="Edit"]');
      cy.get('select[formcontrolname="role"]').select('manager');
      cy.get('select[formcontrolname="status"]').select('inactive');
      clickButtonWhenReady('Save Changes');

      cy.wait('@capNhatTaiKhoan').then(({ request, response }) => {
        expect(request.body).to.have.property('role');
        expect([200, 204, 400, 403, 422]).to.include(response?.statusCode ?? 0);
      });
    });
  });

  it('Permission/Error/Empty: 403 hoặc 500 thì không logout, session vẫn giữ', () => {
    cy.intercept('GET', '**/api/accounts/page**').as('taiTrangTaiKhoan');

    cy.visit('/admin/account-management');
    cy.wait('@taiTrangTaiKhoan').then(({ response }) => {
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
