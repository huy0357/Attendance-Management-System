import type { AuthTokens } from '../../support/commands';

const apiTaiKhoanPage = '**/api/accounts/page**';
const apiTaiKhoan = '**/api/accounts';
const apiTaiKhoanId = '**/api/accounts/*';
const apiRefresh = '**/api/auth/refresh';

const tokenGia: AuthTokens = {
  accessToken: 'token-admin',
  refreshToken: 'refresh-admin',
  username: 'admin',
  role: 'ADMIN',
  expiresInSeconds: 3600,
};

const duLieuTaiKhoan = (items: Array<any>, totalItems = items.length) => ({
  items,
  totalItems,
  totalPages: totalItems === 0 ? 0 : 1,
});

const moTrangQuanLy = () => {
  cy.thamTrangCoAuth('/admin/account-management', tokenGia);
};

const moModalThem = () => {
  cy.contains('Add User').click();
  cy.contains('Add New User').should('be.visible');
};

const moModalSua = () => {
  cy.get('button[title="Edit"]').first().click();
  cy.contains('Edit User Account').should('be.visible');
};

const moModalXoa = () => {
  cy.get('button[title="Delete"]').first().click();
  cy.contains('Delete User').should('be.visible');
};

const nhapFormThem = () => {
  cy.get('input[formcontrolname="name"]').clear().type('QA User');
  cy.get('input[formcontrolname="email"]').clear().type('qa.user@amscore.com');
  cy.get('select[formcontrolname="role"]').select('employee');
  cy.get('select[formcontrolname="department"]').select('Operations');
  cy.get('input[formcontrolname="tempPassword"]').clear().type('TempPass123!');
  cy.get('select[formcontrolname="status"]').select('Active');
};

const nhapFormSua = () => {
  cy.get('input[formcontrolname="name"]').clear().type('QA User Updated');
  cy.get('input[formcontrolname="email"]').clear().type('qa.updated@amscore.com');
  cy.get('select[formcontrolname="role"]').select('manager');
  cy.get('input[formcontrolname="department"]').clear().type('Operations');
  cy.get('select[formcontrolname="status"]').select('active');
};

describe('Quản lý tài khoản - API thật', () => {
  describe('Danh sách', () => {
    it('Load danh sách thành công', () => {
      cy.intercept('GET', apiTaiKhoanPage, (req) => {
        req.reply({
          statusCode: 200,
          body: duLieuTaiKhoan([
            {
              accountId: 1,
              username: 'admin',
              role: 'ADMIN',
              isActive: true,
              createdAt: '2026-01-01T00:00:00Z',
              lastLoginAt: '2026-01-02T00:00:00Z',
            },
          ]),
        });
      }).as('taiKhoanPage');

      moTrangQuanLy();
      cy.wait('@taiKhoanPage').then((interception) => {
        expect(interception.request.method).to.eq('GET');
        expect(interception.request.url).to.include('/api/accounts/page');
        expect(interception.response?.statusCode).to.eq(200);
      });
      cy.contains('admin').should('be.visible');
    });

    it('Danh sách rỗng', () => {
      cy.intercept('GET', apiTaiKhoanPage, { statusCode: 200, body: duLieuTaiKhoan([]) }).as('taiKhoanPage');
      moTrangQuanLy();
      cy.wait('@taiKhoanPage');
      cy.contains('No users found matching your criteria.').should('be.visible');
      cy.contains('Showing 0 of 0 users').should('be.visible');
    });

    it('Lỗi 401 dẫn tới quay về login', () => {
      cy.intercept('GET', apiTaiKhoanPage, { statusCode: 401, body: { message: 'Unauthorized' } }).as(
        'taiKhoanPage',
      );
      cy.intercept('POST', apiRefresh, { statusCode: 401, body: { message: 'Refresh failed' } }).as('lamMoiToken');

      moTrangQuanLy();
      cy.wait('@taiKhoanPage');
      cy.wait('@lamMoiToken');
      cy.url().should('include', '/login');
    });

    it('Lỗi 403 hiển thị banner lỗi', () => {
      cy.intercept('GET', apiTaiKhoanPage, { statusCode: 403, body: { message: 'Forbidden' } }).as(
        'taiKhoanPage',
      );
      moTrangQuanLy();
      cy.wait('@taiKhoanPage');
      cy.contains('Unable to load account data. Please try again.').should('be.visible');
    });
  });

  describe('Tạo mới', () => {
    it('Tạo mới thành công', () => {
      cy.intercept('GET', apiTaiKhoanPage, {
        statusCode: 200,
        body: duLieuTaiKhoan([
          { accountId: 1, username: 'admin', role: 'ADMIN', isActive: true },
        ]),
      }).as('taiKhoanPage');
      cy.intercept('POST', apiTaiKhoan, (req) => {
        const allowed = ['employeeId', 'username', 'password', 'role', 'isActive'];
        expect(Object.keys(req.body)).to.have.length(5);
        Object.keys(req.body).forEach((key) => expect(allowed).to.include(key));
        req.reply({ statusCode: 201, body: { accountId: 2 } });
      }).as('taoTaiKhoan');

      cy.intercept('GET', apiTaiKhoanPage, {
        statusCode: 200,
        body: duLieuTaiKhoan([
          { accountId: 1, username: 'admin', role: 'ADMIN', isActive: true },
          { accountId: 2, username: 'QA User', role: 'EMPLOYEE', isActive: true },
        ]),
      }).as('taiKhoanPageSauTao');

      moTrangQuanLy();
      cy.wait('@taiKhoanPage');
      moModalThem();
      nhapFormThem();
      cy.contains('Create User').click();

      cy.wait('@taoTaiKhoan');
      cy.wait('@taiKhoanPageSauTao');
      cy.contains('QA User').should('be.visible');
    });

    it('Lỗi validation từ BE', () => {
      cy.intercept('GET', apiTaiKhoanPage, {
        statusCode: 200,
        body: duLieuTaiKhoan([{ accountId: 1, username: 'admin', role: 'ADMIN', isActive: true }]),
      }).as('taiKhoanPage');
      cy.intercept('POST', apiTaiKhoan, { statusCode: 400, body: { message: 'Invalid payload' } }).as(
        'taoTaiKhoan',
      );

      moTrangQuanLy();
      cy.wait('@taiKhoanPage');
      moModalThem();
      nhapFormThem();
      cy.contains('Create User').click();
      cy.wait('@taoTaiKhoan');
      cy.contains('Add New User').should('be.visible');
    });

    it('Không gửi field thừa khi tạo mới', () => {
      cy.intercept('GET', apiTaiKhoanPage, {
        statusCode: 200,
        body: duLieuTaiKhoan([{ accountId: 1, username: 'admin', role: 'ADMIN', isActive: true }]),
      }).as('taiKhoanPage');
      cy.intercept('POST', apiTaiKhoan, (req) => {
        const allowed = ['employeeId', 'username', 'password', 'role', 'isActive'];
        Object.keys(req.body).forEach((key) => expect(allowed).to.include(key));
        req.reply({ statusCode: 201, body: { accountId: 3 } });
      }).as('taoTaiKhoan');

      moTrangQuanLy();
      cy.wait('@taiKhoanPage');
      moModalThem();
      nhapFormThem();
      cy.contains('Create User').click();
      cy.wait('@taoTaiKhoan');
    });
  });

  describe('Cập nhật', () => {
    it('Cập nhật thành công', () => {
      cy.intercept('GET', apiTaiKhoanPage, {
        statusCode: 200,
        body: duLieuTaiKhoan([
          { accountId: 10, username: 'qa-user', role: 'EMPLOYEE', isActive: true },
        ]),
      }).as('taiKhoanPage');
      cy.intercept('PUT', apiTaiKhoanId, (req) => {
        const allowed = ['username', 'role', 'isActive'];
        Object.keys(req.body).forEach((key) => expect(allowed).to.include(key));
        req.reply({ statusCode: 200, body: { accountId: 10 } });
      }).as('capNhatTaiKhoan');
      cy.intercept('GET', apiTaiKhoanPage, {
        statusCode: 200,
        body: duLieuTaiKhoan([
          { accountId: 10, username: 'QA User Updated', role: 'MANAGER', isActive: true },
        ]),
      }).as('taiKhoanPageSauCapNhat');

      moTrangQuanLy();
      cy.wait('@taiKhoanPage');
      moModalSua();
      nhapFormSua();
      cy.contains('Save Changes').click();
      cy.wait('@capNhatTaiKhoan');
      cy.wait('@taiKhoanPageSauCapNhat');
      cy.contains('QA User Updated').should('be.visible');
    });

    it('Cập nhật với ID không tồn tại', () => {
      cy.intercept('GET', apiTaiKhoanPage, {
        statusCode: 200,
        body: duLieuTaiKhoan([{ accountId: 99, username: 'ghost', role: 'EMPLOYEE', isActive: true }]),
      }).as('taiKhoanPage');
      cy.intercept('PUT', apiTaiKhoanId, { statusCode: 404, body: { message: 'Not found' } }).as(
        'capNhatTaiKhoan',
      );

      moTrangQuanLy();
      cy.wait('@taiKhoanPage');
      moModalSua();
      nhapFormSua();
      cy.contains('Save Changes').click();
      cy.wait('@capNhatTaiKhoan');
      cy.contains('Edit User Account').should('not.exist');
    });

    it('Cập nhật bị từ chối quyền (403)', () => {
      cy.intercept('GET', apiTaiKhoanPage, {
        statusCode: 200,
        body: duLieuTaiKhoan([{ accountId: 11, username: 'user-403', role: 'EMPLOYEE', isActive: true }]),
      }).as('taiKhoanPage');
      cy.intercept('PUT', apiTaiKhoanId, { statusCode: 403, body: { message: 'Forbidden' } }).as(
        'capNhatTaiKhoan',
      );

      moTrangQuanLy();
      cy.wait('@taiKhoanPage');
      moModalSua();
      nhapFormSua();
      cy.contains('Save Changes').click();
      cy.wait('@capNhatTaiKhoan');
      cy.contains('Edit User Account').should('not.exist');
    });
  });

  describe('Xóa', () => {
    it('Xóa thành công (204)', () => {
      cy.intercept('GET', apiTaiKhoanPage, {
        statusCode: 200,
        body: duLieuTaiKhoan([{ accountId: 20, username: 'delete-me', role: 'EMPLOYEE', isActive: true }]),
      }).as('taiKhoanPage');
      cy.intercept('DELETE', apiTaiKhoanId, { statusCode: 204 }).as('xoaTaiKhoan');
      cy.intercept('GET', apiTaiKhoanPage, { statusCode: 200, body: duLieuTaiKhoan([]) }).as(
        'taiKhoanPageSauXoa',
      );

      moTrangQuanLy();
      cy.wait('@taiKhoanPage');
      moModalXoa();
      cy.contains('button', 'Delete User').click();
      cy.wait('@xoaTaiKhoan');
      cy.wait('@taiKhoanPageSauXoa');
      cy.contains('No users found matching your criteria.').should('be.visible');
    });

    it('Xóa item không tồn tại', () => {
      const canhBao = cy.stub();
      cy.on('window:alert', canhBao);

      cy.intercept('GET', apiTaiKhoanPage, {
        statusCode: 200,
        body: duLieuTaiKhoan([{ accountId: 21, username: 'missing', role: 'EMPLOYEE', isActive: true }]),
      }).as('taiKhoanPage');
      cy.intercept('DELETE', apiTaiKhoanId, { statusCode: 404, body: { message: 'Not found' } }).as(
        'xoaTaiKhoan',
      );

      moTrangQuanLy();
      cy.wait('@taiKhoanPage');
      moModalXoa();
      cy.contains('button', 'Delete User').click();
      cy.wait('@xoaTaiKhoan');
      cy.wrap(canhBao).should('have.been.calledWith', 'Failed to delete user');
    });

    it('Xóa bị 403', () => {
      const canhBao = cy.stub();
      cy.on('window:alert', canhBao);

      cy.intercept('GET', apiTaiKhoanPage, {
        statusCode: 200,
        body: duLieuTaiKhoan([{ accountId: 22, username: 'forbidden', role: 'EMPLOYEE', isActive: true }]),
      }).as('taiKhoanPage');
      cy.intercept('DELETE', apiTaiKhoanId, { statusCode: 403, body: { message: 'Forbidden' } }).as(
        'xoaTaiKhoan',
      );

      moTrangQuanLy();
      cy.wait('@taiKhoanPage');
      moModalXoa();
      cy.contains('button', 'Delete User').click();
      cy.wait('@xoaTaiKhoan');
      cy.wrap(canhBao).should('have.been.calledWith', 'Failed to delete user');
    });
  });
});
