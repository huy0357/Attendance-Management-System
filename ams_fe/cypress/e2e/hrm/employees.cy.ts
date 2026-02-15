import type { AuthTokens } from '../../support/commands';

const apiNhanVienPage = '**/api/employees/page**';
const apiNhanVien = '**/api/employees';
const apiNhanVienId = '**/api/employees/*';
const apiPhongBan = /\/api\/departments(\?|$)/;
const apiRefresh = '**/api/auth/refresh';

const tokenGia: AuthTokens = {
  accessToken: 'token-hr',
  refreshToken: 'refresh-hr',
  username: 'hr',
  role: 'HR',
  expiresInSeconds: 3600,
};

const duLieuNhanVien = (items: Array<any>, totalItems = items.length) => ({
  items,
  totalItems,
  totalPages: totalItems === 0 ? 0 : 1,
});

const moTrang = () => {
  cy.thamTrangCoAuth('/hrm/employees', tokenGia);
};

const moModalThem = () => {
  cy.contains('Add Employee').click();
  cy.contains('Add New Employee').should('be.visible');
};

const moModalSua = () => {
  cy.get('button[title="Edit"]').first().click();
  cy.contains('Edit Employee').should('be.visible');
};

const moModalXoa = () => {
  cy.get('button[title="Delete"]').first().click();
  cy.contains('Delete Employee').should('be.visible');
};

const nhapFormThem = () => {
  cy.get('input[formcontrolname="firstName"]').clear().type('QA');
  cy.get('input[formcontrolname="lastName"]').clear().type('User');
  cy.get('input[formcontrolname="email"]').clear().type('qa.employee@amscore.com');
  cy.get('input[formcontrolname="phone"]').clear().type('0123456789');
  cy.get('input[formcontrolname="dob"]').clear().type('1995-01-01');
  cy.get('select[formcontrolname="gender"]').select('MALE');
  cy.get('select[formcontrolname="departmentId"]').select('1');
  cy.get('input[formcontrolname="hireDate"]').clear().type('2024-01-01');
};

const nhapFormSua = () => {
  cy.get('input[formcontrolname="name"]').clear().type('QA User Updated');
  cy.get('input[formcontrolname="email"]').clear().type('qa.updated@amscore.com');
  cy.get('input[formcontrolname="phone"]').clear().type('0987654321');
  cy.get('select[formcontrolname="departmentId"]').select('1');
};

describe('Nhân sự - Nhân viên (API thật)', () => {
  describe('Danh sách', () => {
    it('Load danh sách thành công', () => {
      cy.intercept('GET', apiNhanVienPage, {
        statusCode: 200,
        body: duLieuNhanVien([
          {
            employeeId: 1,
            employeeCode: 'EMP-001',
            fullName: 'QA User',
            status: 'active',
            departmentId: 1,
          },
        ]),
      }).as('nhanVienPage');
      cy.intercept('GET', apiPhongBan, {
        statusCode: 200,
        body: [{ departmentId: 1, departmentName: 'Operations' }],
      }).as('phongBan');

      moTrang();
      cy.wait('@nhanVienPage').then((interception) => {
        expect(interception.request.method).to.eq('GET');
        expect(interception.request.url).to.include('/api/employees/page');
        expect(interception.response?.statusCode).to.eq(200);
      });
      cy.wait('@phongBan');
      cy.contains('QA User').should('be.visible');
    });

    it('Danh sách rỗng', () => {
      cy.intercept('GET', apiNhanVienPage, { statusCode: 200, body: duLieuNhanVien([]) }).as('nhanVienPage');
      cy.intercept('GET', apiPhongBan, { statusCode: 200, body: [] }).as('phongBan');

      moTrang();
      cy.wait('@nhanVienPage');
      cy.contains('Showing 0 of 0 employees').should('be.visible');
    });

    it('Lỗi 401 dẫn tới quay về login', () => {
      cy.intercept('GET', apiNhanVienPage, { statusCode: 401, body: { message: 'Unauthorized' } }).as(
        'nhanVienPage',
      );
      cy.intercept('POST', apiRefresh, { statusCode: 401, body: { message: 'Refresh failed' } }).as('lamMoiToken');
      moTrang();
      cy.wait('@nhanVienPage');
      cy.wait('@lamMoiToken');
      cy.url().should('include', '/login');
    });

    it('Lỗi 403 hiển thị banner lỗi', () => {
      cy.intercept('GET', apiNhanVienPage, { statusCode: 403, body: { message: 'Forbidden' } }).as(
        'nhanVienPage',
      );
      cy.intercept('GET', apiPhongBan, { statusCode: 200, body: [] }).as('phongBan');

      moTrang();
      cy.wait('@nhanVienPage');
      cy.contains('Unable to load employee data. Please try again.').should('be.visible');
    });
  });

  describe('Tạo mới', () => {
    it('Tạo mới thành công', () => {
      cy.intercept('GET', apiNhanVienPage, {
        statusCode: 200,
        body: duLieuNhanVien([{ employeeId: 1, employeeCode: 'EMP-001', fullName: 'Old User' }]),
      }).as('nhanVienPage');
      cy.intercept('GET', apiPhongBan, {
        statusCode: 200,
        body: [{ departmentId: 1, departmentName: 'Operations' }],
      }).as('phongBan');
      cy.intercept('POST', apiNhanVien, (req) => {
        const allowed = [
          'employeeCode',
          'fullName',
          'dob',
          'gender',
          'phone',
          'email',
          'departmentId',
          'hireDate',
        ];
        Object.keys(req.body).forEach((key) => expect(allowed).to.include(key));
        req.reply({ statusCode: 201, body: { employeeId: 2 } });
      }).as('taoNhanVien');

      cy.intercept('GET', apiNhanVienPage, {
        statusCode: 200,
        body: duLieuNhanVien([
          { employeeId: 1, employeeCode: 'EMP-001', fullName: 'Old User' },
          { employeeId: 2, employeeCode: 'EMP-002', fullName: 'QA User' },
        ]),
      }).as('nhanVienPageSauTao');

      moTrang();
      cy.wait('@nhanVienPage');
      moModalThem();
      nhapFormThem();
      cy.contains('Add Employee').click();
      cy.wait('@taoNhanVien');
      cy.wait('@nhanVienPageSauTao');
      cy.contains('QA User').should('be.visible');
    });

    it('Lỗi validation từ BE', () => {
      const canhBao = cy.stub();
      cy.on('window:alert', canhBao);

      cy.intercept('GET', apiNhanVienPage, { statusCode: 200, body: duLieuNhanVien([]) }).as('nhanVienPage');
      cy.intercept('GET', apiPhongBan, { statusCode: 200, body: [] }).as('phongBan');
      cy.intercept('POST', apiNhanVien, { statusCode: 400, body: { message: 'Invalid payload' } }).as(
        'taoNhanVien',
      );

      moTrang();
      cy.wait('@nhanVienPage');
      moModalThem();
      nhapFormThem();
      cy.contains('Add Employee').click();
      cy.wait('@taoNhanVien');
      cy.wrap(canhBao).should('have.been.calledWith', 'Unable to add employee. Please try again.');
    });

    it('Không gửi field thừa khi tạo mới', () => {
      cy.intercept('GET', apiNhanVienPage, { statusCode: 200, body: duLieuNhanVien([]) }).as('nhanVienPage');
      cy.intercept('GET', apiPhongBan, {
        statusCode: 200,
        body: [{ departmentId: 1, departmentName: 'Operations' }],
      }).as('phongBan');
      cy.intercept('POST', apiNhanVien, (req) => {
        const allowed = [
          'employeeCode',
          'fullName',
          'dob',
          'gender',
          'phone',
          'email',
          'departmentId',
          'hireDate',
        ];
        Object.keys(req.body).forEach((key) => expect(allowed).to.include(key));
        req.reply({ statusCode: 201, body: { employeeId: 3 } });
      }).as('taoNhanVien');

      moTrang();
      cy.wait('@nhanVienPage');
      moModalThem();
      nhapFormThem();
      cy.contains('Add Employee').click();
      cy.wait('@taoNhanVien');
    });
  });

  describe('Cập nhật', () => {
    it('Cập nhật thành công', () => {
      cy.intercept('GET', apiNhanVienPage, {
        statusCode: 200,
        body: duLieuNhanVien([{ employeeId: 5, employeeCode: 'EMP-005', fullName: 'QA User' }]),
      }).as('nhanVienPage');
      cy.intercept('GET', apiPhongBan, {
        statusCode: 200,
        body: [{ departmentId: 1, departmentName: 'Operations' }],
      }).as('phongBan');
      cy.intercept('GET', apiNhanVienId, {
        statusCode: 200,
        body: {
          employeeId: 5,
          employeeCode: 'EMP-005',
          fullName: 'QA User',
          departmentId: 1,
          status: 'active',
        },
      }).as('nhanVienChiTiet');
      cy.intercept('PUT', apiNhanVienId, (req) => {
        const allowed = [
          'employeeCode',
          'fullName',
          'email',
          'phone',
          'departmentId',
          'positionId',
          'managerId',
          'dob',
          'gender',
          'hireDate',
        ];
        Object.keys(req.body).forEach((key) => expect(allowed).to.include(key));
        req.reply({ statusCode: 200, body: { employeeId: 5 } });
      }).as('capNhatNhanVien');
      cy.intercept('GET', apiNhanVienPage, {
        statusCode: 200,
        body: duLieuNhanVien([{ employeeId: 5, employeeCode: 'EMP-005', fullName: 'QA User Updated' }]),
      }).as('nhanVienPageSauCapNhat');

      moTrang();
      cy.wait('@nhanVienPage');
      moModalSua();
      cy.wait('@nhanVienChiTiet');
      nhapFormSua();
      cy.contains('Save Changes').click();
      cy.wait('@capNhatNhanVien');
      cy.wait('@nhanVienPageSauCapNhat');
      cy.contains('QA User Updated').should('be.visible');
    });

    it('Cập nhật với ID không tồn tại', () => {
      const canhBao = cy.stub();
      cy.on('window:alert', canhBao);

      cy.intercept('GET', apiNhanVienPage, {
        statusCode: 200,
        body: duLieuNhanVien([{ employeeId: 404, employeeCode: 'EMP-404', fullName: 'Ghost' }]),
      }).as('nhanVienPage');
      cy.intercept('GET', apiPhongBan, { statusCode: 200, body: [] }).as('phongBan');
      cy.intercept('GET', apiNhanVienId, {
        statusCode: 200,
        body: { employeeId: 404, employeeCode: 'EMP-404', fullName: 'Ghost' },
      }).as('nhanVienChiTiet');
      cy.intercept('PUT', apiNhanVienId, { statusCode: 404, body: { message: 'Not found' } }).as(
        'capNhatNhanVien',
      );

      moTrang();
      cy.wait('@nhanVienPage');
      moModalSua();
      cy.wait('@nhanVienChiTiet');
      nhapFormSua();
      cy.contains('Save Changes').click();
      cy.wait('@capNhatNhanVien');
      cy.wrap(canhBao).should('have.been.calledWith', 'Unable to update employee. Please try again.');
    });

    it('Cập nhật bị từ chối quyền (403)', () => {
      const canhBao = cy.stub();
      cy.on('window:alert', canhBao);

      cy.intercept('GET', apiNhanVienPage, {
        statusCode: 200,
        body: duLieuNhanVien([{ employeeId: 6, employeeCode: 'EMP-006', fullName: 'QA User' }]),
      }).as('nhanVienPage');
      cy.intercept('GET', apiPhongBan, { statusCode: 200, body: [] }).as('phongBan');
      cy.intercept('GET', apiNhanVienId, {
        statusCode: 200,
        body: { employeeId: 6, employeeCode: 'EMP-006', fullName: 'QA User' },
      }).as('nhanVienChiTiet');
      cy.intercept('PUT', apiNhanVienId, { statusCode: 403, body: { message: 'Forbidden' } }).as(
        'capNhatNhanVien',
      );

      moTrang();
      cy.wait('@nhanVienPage');
      moModalSua();
      cy.wait('@nhanVienChiTiet');
      nhapFormSua();
      cy.contains('Save Changes').click();
      cy.wait('@capNhatNhanVien');
      cy.wrap(canhBao).should('have.been.calledWith', 'Unable to update employee. Please try again.');
    });
  });

  describe('Xóa', () => {
    it('Xóa thành công (204)', () => {
      cy.intercept('GET', apiNhanVienPage, {
        statusCode: 200,
        body: duLieuNhanVien([{ employeeId: 7, employeeCode: 'EMP-007', fullName: 'Delete Me' }]),
      }).as('nhanVienPage');
      cy.intercept('GET', apiPhongBan, { statusCode: 200, body: [] }).as('phongBan');
      cy.intercept('DELETE', apiNhanVienId, { statusCode: 204 }).as('xoaNhanVien');
      cy.intercept('GET', apiNhanVienPage, { statusCode: 200, body: duLieuNhanVien([]) }).as(
        'nhanVienPageSauXoa',
      );

      moTrang();
      cy.wait('@nhanVienPage');
      moModalXoa();
      cy.contains('button', 'Delete Employee').click();
      cy.wait('@xoaNhanVien');
      cy.wait('@nhanVienPageSauXoa');
      cy.contains('Showing 0 of 0 employees').should('be.visible');
    });

    it('Xóa item không tồn tại', () => {
      const canhBao = cy.stub();
      cy.on('window:alert', canhBao);

      cy.intercept('GET', apiNhanVienPage, {
        statusCode: 200,
        body: duLieuNhanVien([{ employeeId: 8, employeeCode: 'EMP-008', fullName: 'Ghost' }]),
      }).as('nhanVienPage');
      cy.intercept('GET', apiPhongBan, { statusCode: 200, body: [] }).as('phongBan');
      cy.intercept('DELETE', apiNhanVienId, { statusCode: 404, body: { message: 'Not found' } }).as(
        'xoaNhanVien',
      );

      moTrang();
      cy.wait('@nhanVienPage');
      moModalXoa();
      cy.contains('button', 'Delete Employee').click();
      cy.wait('@xoaNhanVien');
      cy.wrap(canhBao).should('have.been.calledWith', 'Unable to delete employee. Please try again.');
    });

    it('Xóa bị 403', () => {
      const canhBao = cy.stub();
      cy.on('window:alert', canhBao);

      cy.intercept('GET', apiNhanVienPage, {
        statusCode: 200,
        body: duLieuNhanVien([{ employeeId: 9, employeeCode: 'EMP-009', fullName: 'Forbidden' }]),
      }).as('nhanVienPage');
      cy.intercept('GET', apiPhongBan, { statusCode: 200, body: [] }).as('phongBan');
      cy.intercept('DELETE', apiNhanVienId, { statusCode: 403, body: { message: 'Forbidden' } }).as(
        'xoaNhanVien',
      );

      moTrang();
      cy.wait('@nhanVienPage');
      moModalXoa();
      cy.contains('button', 'Delete Employee').click();
      cy.wait('@xoaNhanVien');
      cy.wrap(canhBao).should('have.been.calledWith', 'Unable to delete employee. Please try again.');
    });
  });
});
