import type { AuthTokens } from '../../support/commands';

const apiPhongBanList = /\/api\/departments(\?|$)/;
const apiPhongBanTree = '**/api/departments/tree**';
const apiPhongBan = '**/api/departments';
const apiPhongBanId = '**/api/departments/*';
const apiRefresh = '**/api/auth/refresh';

const tokenGia: AuthTokens = {
  accessToken: 'token-hr',
  refreshToken: 'refresh-hr',
  username: 'hr',
  role: 'HR',
  expiresInSeconds: 3600,
};

const duLieuPhongBan = (items: Array<any>, totalItems = items.length) => ({
  items,
  totalItems,
  totalPages: totalItems === 0 ? 0 : 1,
  page: 1,
  size: 10,
  hasNext: false,
  hasPrev: false,
});

const moTrang = () => {
  cy.thamTrangCoAuth('/hrm/departments', tokenGia);
};

const moModalThem = () => {
  cy.contains('Add Department').click();
  cy.contains('Add New Department').should('be.visible');
};

const moModalSua = () => {
  cy.get('button[title="Edit"]').first().click();
  cy.contains('Edit Department').should('be.visible');
};

const moModalXoa = () => {
  cy.get('button[title="Delete"]').first().click();
  cy.contains('Delete Department').should('be.visible');
};

const nhapFormThem = () => {
  cy.get('input[formcontrolname="departmentName"]').clear().type('QA Department');
  cy.get('input[formcontrolname="departmentCode"]').clear().type('QA');
  cy.get('select[formcontrolname="parentDepartmentId"]').select('Select parent department (Root)');
};

const nhapFormSua = () => {
  cy.get('input[formcontrolname="departmentName"]').clear().type('QA Department Updated');
  cy.get('input[formcontrolname="departmentCode"]').clear().type('QAU');
};

describe('Nhân sự - Phòng ban (API thật)', () => {
  describe('Danh sách', () => {
    it('Load danh sách thành công', () => {
      cy.intercept('GET', apiPhongBanList, {
        statusCode: 200,
        body: duLieuPhongBan([
          {
            departmentId: 1,
            departmentName: 'Operations',
            departmentCode: 'OPS',
            isActive: true,
          },
        ]),
      }).as('phongBanList');
      cy.intercept('GET', apiPhongBanTree, {
        statusCode: 200,
        body: [{ departmentId: 1, departmentName: 'Operations', departmentCode: 'OPS', isActive: true }],
      }).as('phongBanTree');

      moTrang();
      cy.wait('@phongBanList').then((interception) => {
        expect(interception.request.method).to.eq('GET');
        expect(interception.request.url).to.include('/api/departments');
        expect(interception.response?.statusCode).to.eq(200);
      });
      cy.wait('@phongBanTree');
      cy.contains('Operations').should('be.visible');
    });

    it('Danh sách rỗng', () => {
      cy.intercept('GET', apiPhongBanList, { statusCode: 200, body: duLieuPhongBan([]) }).as('phongBanList');
      cy.intercept('GET', apiPhongBanTree, { statusCode: 200, body: [] }).as('phongBanTree');

      moTrang();
      cy.wait('@phongBanList');
      cy.contains('No departments found.').should('be.visible');
      cy.contains('Showing 0 of 0 departments').should('be.visible');
    });

    it('Lỗi 401 dẫn tới quay về login', () => {
      cy.intercept('GET', apiPhongBanList, { statusCode: 401, body: { message: 'Unauthorized' } }).as(
        'phongBanList',
      );
      cy.intercept('POST', apiRefresh, { statusCode: 401, body: { message: 'Refresh failed' } }).as('lamMoiToken');

      moTrang();
      cy.wait('@phongBanList');
      cy.wait('@lamMoiToken');
      cy.url().should('include', '/login');
    });

    it('Lỗi 403 hiển thị banner lỗi', () => {
      cy.intercept('GET', apiPhongBanList, { statusCode: 403, body: { message: 'Forbidden' } }).as('phongBanList');
      cy.intercept('GET', apiPhongBanTree, { statusCode: 200, body: [] }).as('phongBanTree');

      moTrang();
      cy.wait('@phongBanList');
      cy.contains('Unable to load department data. Please try again.').should('be.visible');
    });
  });

  describe('Tạo mới', () => {
    it('Tạo mới thành công', () => {
      cy.intercept('GET', apiPhongBanList, {
        statusCode: 200,
        body: duLieuPhongBan([
          { departmentId: 1, departmentName: 'Operations', departmentCode: 'OPS', isActive: true },
        ]),
      }).as('phongBanList');
      cy.intercept('GET', apiPhongBanTree, {
        statusCode: 200,
        body: [{ departmentId: 1, departmentName: 'Operations', departmentCode: 'OPS', isActive: true }],
      }).as('phongBanTree');
      cy.intercept('POST', apiPhongBan, (req) => {
        const allowed = ['departmentName', 'departmentCode', 'parentDepartmentId', 'isActive'];
        Object.keys(req.body).forEach((key) => expect(allowed).to.include(key));
        req.reply({ statusCode: 201, body: { departmentId: 2 } });
      }).as('taoPhongBan');
      cy.intercept('GET', apiPhongBanList, {
        statusCode: 200,
        body: duLieuPhongBan([
          { departmentId: 1, departmentName: 'Operations', departmentCode: 'OPS', isActive: true },
          { departmentId: 2, departmentName: 'QA Department', departmentCode: 'QA', isActive: true },
        ]),
      }).as('phongBanListSauTao');
      cy.intercept('GET', apiPhongBanTree, {
        statusCode: 200,
        body: [
          { departmentId: 1, departmentName: 'Operations', departmentCode: 'OPS', isActive: true },
          { departmentId: 2, departmentName: 'QA Department', departmentCode: 'QA', isActive: true },
        ],
      }).as('phongBanTreeSauTao');

      moTrang();
      cy.wait('@phongBanList');
      moModalThem();
      nhapFormThem();
      cy.contains('Add Department').click();
      cy.wait('@taoPhongBan');
      cy.wait('@phongBanListSauTao');
      cy.contains('QA Department').should('be.visible');
    });

    it('Lỗi validation từ BE', () => {
      const canhBao = cy.stub();
      cy.on('window:alert', canhBao);

      cy.intercept('GET', apiPhongBanList, { statusCode: 200, body: duLieuPhongBan([]) }).as('phongBanList');
      cy.intercept('GET', apiPhongBanTree, { statusCode: 200, body: [] }).as('phongBanTree');
      cy.intercept('POST', apiPhongBan, { statusCode: 400, body: { message: 'Invalid payload' } }).as(
        'taoPhongBan',
      );

      moTrang();
      cy.wait('@phongBanList');
      moModalThem();
      nhapFormThem();
      cy.contains('Add Department').click();
      cy.wait('@taoPhongBan');
      cy.wrap(canhBao).should('have.been.calledWith', 'Failed to create department');
    });

    it('Không gửi field thừa khi tạo mới', () => {
      cy.intercept('GET', apiPhongBanList, { statusCode: 200, body: duLieuPhongBan([]) }).as('phongBanList');
      cy.intercept('GET', apiPhongBanTree, { statusCode: 200, body: [] }).as('phongBanTree');
      cy.intercept('POST', apiPhongBan, (req) => {
        const allowed = ['departmentName', 'departmentCode', 'parentDepartmentId', 'isActive'];
        Object.keys(req.body).forEach((key) => expect(allowed).to.include(key));
        req.reply({ statusCode: 201, body: { departmentId: 3 } });
      }).as('taoPhongBan');

      moTrang();
      cy.wait('@phongBanList');
      moModalThem();
      nhapFormThem();
      cy.contains('Add Department').click();
      cy.wait('@taoPhongBan');
    });
  });

  describe('Cập nhật', () => {
    it('Cập nhật thành công', () => {
      cy.intercept('GET', apiPhongBanList, {
        statusCode: 200,
        body: duLieuPhongBan([
          { departmentId: 10, departmentName: 'QA Department', departmentCode: 'QA', isActive: true },
        ]),
      }).as('phongBanList');
      cy.intercept('GET', apiPhongBanTree, {
        statusCode: 200,
        body: [{ departmentId: 10, departmentName: 'QA Department', departmentCode: 'QA', isActive: true }],
      }).as('phongBanTree');
      cy.intercept('PUT', apiPhongBanId, (req) => {
        const allowed = ['departmentName', 'departmentCode', 'parentDepartmentId', 'isActive'];
        Object.keys(req.body).forEach((key) => expect(allowed).to.include(key));
        req.reply({ statusCode: 200, body: { departmentId: 10 } });
      }).as('capNhatPhongBan');
      cy.intercept('GET', apiPhongBanList, {
        statusCode: 200,
        body: duLieuPhongBan([
          { departmentId: 10, departmentName: 'QA Department Updated', departmentCode: 'QAU', isActive: true },
        ]),
      }).as('phongBanListSauCapNhat');

      moTrang();
      cy.wait('@phongBanList');
      moModalSua();
      nhapFormSua();
      cy.contains('Save Changes').click();
      cy.wait('@capNhatPhongBan');
      cy.wait('@phongBanListSauCapNhat');
      cy.contains('QA Department Updated').should('be.visible');
    });

    it('Cập nhật với ID không tồn tại', () => {
      const canhBao = cy.stub();
      cy.on('window:alert', canhBao);

      cy.intercept('GET', apiPhongBanList, {
        statusCode: 200,
        body: duLieuPhongBan([{ departmentId: 404, departmentName: 'Ghost', departmentCode: 'GHO' }]),
      }).as('phongBanList');
      cy.intercept('GET', apiPhongBanTree, { statusCode: 200, body: [] }).as('phongBanTree');
      cy.intercept('PUT', apiPhongBanId, { statusCode: 404, body: { message: 'Not found' } }).as(
        'capNhatPhongBan',
      );

      moTrang();
      cy.wait('@phongBanList');
      moModalSua();
      nhapFormSua();
      cy.contains('Save Changes').click();
      cy.wait('@capNhatPhongBan');
      cy.wrap(canhBao).should('have.been.calledWith', 'Failed to update department');
    });

    it('Cập nhật bị từ chối quyền (403)', () => {
      const canhBao = cy.stub();
      cy.on('window:alert', canhBao);

      cy.intercept('GET', apiPhongBanList, {
        statusCode: 200,
        body: duLieuPhongBan([{ departmentId: 11, departmentName: 'Forbidden', departmentCode: 'FOR' }]),
      }).as('phongBanList');
      cy.intercept('GET', apiPhongBanTree, { statusCode: 200, body: [] }).as('phongBanTree');
      cy.intercept('PUT', apiPhongBanId, { statusCode: 403, body: { message: 'Forbidden' } }).as(
        'capNhatPhongBan',
      );

      moTrang();
      cy.wait('@phongBanList');
      moModalSua();
      nhapFormSua();
      cy.contains('Save Changes').click();
      cy.wait('@capNhatPhongBan');
      cy.wrap(canhBao).should('have.been.calledWith', 'Failed to update department');
    });
  });

  describe('Xóa', () => {
    it('Xóa thành công (204)', () => {
      cy.intercept('GET', apiPhongBanList, {
        statusCode: 200,
        body: duLieuPhongBan([{ departmentId: 20, departmentName: 'Delete Me', departmentCode: 'DEL' }]),
      }).as('phongBanList');
      cy.intercept('GET', apiPhongBanTree, { statusCode: 200, body: [] }).as('phongBanTree');
      cy.intercept('DELETE', apiPhongBanId, { statusCode: 204 }).as('xoaPhongBan');
      cy.intercept('GET', apiPhongBanList, { statusCode: 200, body: duLieuPhongBan([]) }).as(
        'phongBanListSauXoa',
      );
      cy.intercept('GET', apiPhongBanTree, { statusCode: 200, body: [] }).as('phongBanTreeSauXoa');

      moTrang();
      cy.wait('@phongBanList');
      moModalXoa();
      cy.contains('button', 'Delete Department').click();
      cy.wait('@xoaPhongBan');
      cy.wait('@phongBanListSauXoa');
      cy.contains('No departments found.').should('be.visible');
    });

    it('Xóa item không tồn tại', () => {
      const canhBao = cy.stub();
      cy.on('window:alert', canhBao);

      cy.intercept('GET', apiPhongBanList, {
        statusCode: 200,
        body: duLieuPhongBan([{ departmentId: 21, departmentName: 'Ghost', departmentCode: 'GHO' }]),
      }).as('phongBanList');
      cy.intercept('GET', apiPhongBanTree, { statusCode: 200, body: [] }).as('phongBanTree');
      cy.intercept('DELETE', apiPhongBanId, { statusCode: 404, body: { message: 'Not found' } }).as(
        'xoaPhongBan',
      );

      moTrang();
      cy.wait('@phongBanList');
      moModalXoa();
      cy.contains('button', 'Delete Department').click();
      cy.wait('@xoaPhongBan');
      cy.wrap(canhBao).should('have.been.calledWith', 'Failed to delete department');
    });

    it('Xóa bị 403', () => {
      const canhBao = cy.stub();
      cy.on('window:alert', canhBao);

      cy.intercept('GET', apiPhongBanList, {
        statusCode: 200,
        body: duLieuPhongBan([{ departmentId: 22, departmentName: 'Forbidden', departmentCode: 'FOR' }]),
      }).as('phongBanList');
      cy.intercept('GET', apiPhongBanTree, { statusCode: 200, body: [] }).as('phongBanTree');
      cy.intercept('DELETE', apiPhongBanId, { statusCode: 403, body: { message: 'Forbidden' } }).as(
        'xoaPhongBan',
      );

      moTrang();
      cy.wait('@phongBanList');
      moModalXoa();
      cy.contains('button', 'Delete Department').click();
      cy.wait('@xoaPhongBan');
      cy.wrap(canhBao).should('have.been.calledWith', 'Failed to delete department');
    });
  });
});
