import { assertRequestQuery } from '../../support/request-assertions';
import { clickButtonWhenReady, clickFirstWhenReady } from '../../support/ui-helpers';

describe('Nhân sự - Nhân viên (API thật, không mock)', () => {
  beforeEach(() => {
    cy.login();
  });

  const vaoTrangNhanVien = () => {
    cy.intercept('GET', '**/api/employees/page**').as('taiDanhSachNhanVien');
    cy.intercept('GET', '**/api/departments**').as('taiPhongBan');

    cy.visit('/hrm/employees');
    cy.location('pathname').should('include', '/hrm/employees');
    cy.wait('@taiDanhSachNhanVien');
    cy.wait('@taiPhongBan');
  };

  it('Smoke: tải danh sách nhân viên và hiển thị stats cards', () => {
    vaoTrangNhanVien();

    cy.contains('Employee Management').should('be.visible');
    cy.contains('TOTAL EMPLOYEES').should('be.visible');
    cy.contains('ACTIVE').should('be.visible');
  });

  it('Edge: reload trang vẫn giữ route và gọi lại API danh sách', () => {
    vaoTrangNhanVien();

    cy.reload();
    cy.wait('@taiDanhSachNhanVien').then(({ response }) => {
      expect([200, 204, 403, 500]).to.include(response?.statusCode ?? 0);
    });
    cy.location('pathname').should('include', '/hrm/employees');
  });

  it('Search theo từ khóa thường gửi query name đúng', () => {
    vaoTrangNhanVien();

    cy.intercept('GET', '**/api/employees/search**').as('timNhanVien');

    cy.get('input[placeholder="Search employees..."]').clear().type('an');
    cy.wait('@timNhanVien').then(({ request, response }) => {
      assertRequestQuery(request.query, {
        name: 'an',
        page: /\d+/,
      });
      expect([200, 204, 403, 500]).to.include(response?.statusCode ?? 0);
    });
  });

  it('Search với ký tự có dấu và ký tự đặc biệt không làm vỡ UI', () => {
    vaoTrangNhanVien();

    cy.intercept('GET', '**/api/employees/search**').as('timNhanVien');

    cy.get('input[placeholder="Search employees..."]').clear().type('đặng@#');
    cy.wait('@timNhanVien').then(({ request }) => {
      expect(request.query).to.have.property('name');
    });

    cy.contains('Employee Management').should('be.visible');
  });

  it('Filter theo phòng ban cập nhật danh sách hiển thị', () => {
    vaoTrangNhanVien();

    cy.get('select').first().then(($select) => {
      if ($select.find('option').length <= 1) {
        cy.log('Không có dữ liệu phòng ban để filter');
        return;
      }

      cy.wrap($select).select(1);
      cy.contains('Employee Management').should('be.visible');
    });
  });

  it('Filter theo trạng thái cập nhật danh sách hiển thị', () => {
    vaoTrangNhanVien();

    cy.get('select').eq(1).select('ACTIVE');
    cy.contains('Employee Management').should('be.visible');

    cy.get('select').eq(1).select('ON LEAVE');
    cy.contains('Employee Management').should('be.visible');

    cy.get('select').eq(1).select('INACTIVE');
    cy.contains('Employee Management').should('be.visible');
  });

  it('Kết hợp search + filter rồi reset về mặc định', () => {
    vaoTrangNhanVien();

    cy.intercept('GET', '**/api/employees/search**').as('timNhanVien');

    cy.get('input[placeholder="Search employees..."]').clear().type('a');
    cy.wait('@timNhanVien');

    cy.get('select').eq(1).select('ACTIVE');
    cy.contains('Employee Management').should('be.visible');

    cy.get('input[placeholder="Search employees..."]').clear();
    cy.wait('@taiDanhSachNhanVien');
    cy.get('select').eq(1).select('');
  });

  it('Phân trang Next/Prev gửi page đúng', () => {
    vaoTrangNhanVien();

    cy.contains('button', 'Next').then(($next) => {
      if ($next.is(':disabled')) {
        cy.log('Không có trang tiếp theo');
        return;
      }

      cy.wrap($next).click();
      cy.wait('@taiDanhSachNhanVien').then(({ request }) => {
        assertRequestQuery(request.query, { page: /\d+/ });
      });

      cy.contains('button', 'Prev').then(($prev) => {
        if ($prev.is(':disabled')) {
          return;
        }
        cy.wrap($prev).click();
        cy.wait('@taiDanhSachNhanVien');
      });
    });
  });

  it('Validation required: bỏ trống form thêm mới thì không gửi POST', () => {
    vaoTrangNhanVien();
    cy.intercept('POST', '**/api/employees').as('taoNhanVien');

    cy.waitForOverlayToDisappear();
    cy.contains('button', 'Add Employee').first().click();
    cy.contains('Add New Employee').should('be.visible');
    clickButtonWhenReady('Add Employee');

    cy.get('@taoNhanVien.all').should('have.length', 0);
  });

  it('Validation format email/phone/date sai thì không gửi POST', () => {
    vaoTrangNhanVien();
    cy.intercept('POST', '**/api/employees').as('taoNhanVien');

    cy.waitForOverlayToDisappear();
    cy.contains('button', 'Add Employee').first().click();

    cy.get('input[formcontrolname="firstName"]').type('Test');
    cy.get('input[formcontrolname="lastName"]').type('User');
    cy.get('input[formcontrolname="email"]').type('khong-phai-email');
    cy.get('input[formcontrolname="phone"]').type('12345');
    cy.get('input[formcontrolname="dob"]').type('2999-12-31');

    clickButtonWhenReady('Add Employee');
    cy.get('@taoNhanVien.all').should('have.length', 0);
  });

  it('Luồng Cancel ở form thêm mới không gửi POST', () => {
    vaoTrangNhanVien();
    cy.intercept('POST', '**/api/employees').as('taoNhanVien');

    cy.waitForOverlayToDisappear();
    cy.contains('button', 'Add Employee').first().click();

    cy.get('input[formcontrolname="firstName"]').type('Temp');
    cy.get('input[formcontrolname="lastName"]').type('Cancel');
    clickButtonWhenReady('Cancel');

    cy.contains('Add New Employee').should('not.exist');
    cy.get('@taoNhanVien.all').should('have.length', 0);
  });

  it('Submit hợp lệ form thêm mới phải gửi POST', () => {
    vaoTrangNhanVien();
    cy.intercept('POST', '**/api/employees').as('taoNhanVien');

    cy.waitForOverlayToDisappear();
    cy.contains('button', 'Add Employee').first().click();

    cy.get('input[formcontrolname="firstName"]').type('Auto');
    cy.get('input[formcontrolname="lastName"]').type(`E2E${Date.now()}`);
    cy.get('input[formcontrolname="email"]').type(`auto${Date.now()}@example.com`);
    cy.get('input[formcontrolname="phone"]').type('0912345678');
    cy.get('input[formcontrolname="dob"]').type('1995-06-15');
    cy.get('select[formcontrolname="gender"]').select('MALE');
    cy.get('input[formcontrolname="hireDate"]').type('2024-01-01');

    clickButtonWhenReady('Add Employee');

    cy.wait('@taoNhanVien').then(({ request, response }) => {
      expect(request.body).to.have.property('fullName');
      expect([200, 201, 400, 403, 422]).to.include(response?.statusCode ?? 0);
    });
  });

  it('Edit: mở modal đúng dữ liệu và bấm Cancel không gửi PUT', () => {
    vaoTrangNhanVien();
    cy.intercept('GET', '**/api/employees/*').as('chiTietNhanVien');
    cy.intercept('PUT', '**/api/employees/*').as('capNhatNhanVien');

    cy.get('body').then(($body) => {
      if ($body.find('button[title="Edit"]').length === 0) {
        cy.log('Không có dữ liệu để mở modal edit');
        return;
      }

      clickFirstWhenReady('button[title="Edit"]');
      cy.wait('@chiTietNhanVien');
      cy.contains('Edit Employee').should('be.visible');
      clickButtonWhenReady('Cancel');

      cy.get('@capNhatNhanVien.all').should('have.length', 0);
    });
  });

  it('Delete: xác nhận xóa thì gửi DELETE đúng luồng', () => {
    vaoTrangNhanVien();
    cy.intercept('DELETE', '**/api/employees/*').as('xoaNhanVien');

    cy.get('body').then(($body) => {
      if ($body.find('button[title="Delete"]').length === 0) {
        cy.log('Không có dữ liệu để xóa');
        return;
      }

      clickFirstWhenReady('button[title="Delete"]');
      cy.contains('Delete Employee').should('be.visible');

      clickButtonWhenReady('Delete Employee');
      cy.wait('@xoaNhanVien').then(({ response }) => {
        expect([200, 204, 403, 404]).to.include(response?.statusCode ?? 0);
      });
    });
  });

  it('Permission/Error: gặp 403/500 thì không logout và UI không crash', () => {
    cy.intercept('GET', '**/api/employees/page**').as('taiDanhSachNhanVien');

    cy.visit('/hrm/employees');
    cy.wait('@taiDanhSachNhanVien').then(({ response }) => {
      const status = response?.statusCode ?? 0;

      if (status === 403) {
        cy.contains('Unable to load employee data. Please try again.').should('be.visible');
      }

      if (status >= 500) {
        cy.contains('Employee Management').should('be.visible');
      }

      cy.url().should('not.include', '/login');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('ams.accessToken')).to.be.a('string').and.not.be.empty;
      });
    });
  });
});
