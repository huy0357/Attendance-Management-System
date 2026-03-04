import { assertRequestQuery } from '../../support/request-assertions';
import { clickButtonWhenReady, clickFirstWhenReady } from '../../support/ui-helpers';

describe('Nhân sự - Phòng ban (API thật, không mock)', () => {
  beforeEach(() => {
    cy.login();
  });

  const vaoTrangPhongBan = () => {
    cy.intercept('GET', '**/api/departments?**').as('taiDanhSachPhongBan');
    cy.intercept('GET', '**/api/departments/tree**').as('taiCayPhongBan');

    cy.visit('/hrm/departments');
    cy.location('pathname').should('include', '/hrm/departments');
    cy.wait('@taiDanhSachPhongBan');
    cy.wait('@taiCayPhongBan');
  };

  it('Smoke: tải trang phòng ban và hiển thị bảng', () => {
    vaoTrangPhongBan();

    cy.contains('Department Management').should('be.visible');
    cy.contains('Department').should('be.visible');
  });

  it('Edge: reload trang vẫn gọi lại API danh sách', () => {
    vaoTrangPhongBan();

    cy.reload();
    cy.wait('@taiDanhSachPhongBan').then(({ response }) => {
      expect([200, 204, 403, 500]).to.include(response?.statusCode ?? 0);
    });
  });

  it('Search với keyword thường gửi query đúng', () => {
    vaoTrangPhongBan();

    cy.get('input[placeholder="Search departments..."]').clear().type('it');
    cy.wait('@taiDanhSachPhongBan').then(({ request }) => {
      assertRequestQuery(request.query, {
        keyword: 'it',
      });
    });
  });

  it('Search với ký tự có dấu và đặc biệt không làm vỡ UI', () => {
    vaoTrangPhongBan();

    cy.get('input[placeholder="Search departments..."]').clear().type('đơn vị@#');
    cy.wait('@taiDanhSachPhongBan').then(({ request }) => {
      expect(request.query).to.have.property('keyword');
    });

    cy.contains('Department Management').should('be.visible');
  });

  it('Phân trang Next và Prev gửi page phù hợp', () => {
    vaoTrangPhongBan();

    cy.contains('button', 'Next').then(($next) => {
      if ($next.is(':disabled')) {
        cy.log('Không có trang tiếp theo');
        return;
      }

      cy.wrap($next).click();
      cy.wait('@taiDanhSachPhongBan').then(({ request }) => {
        assertRequestQuery(request.query, { page: /\d+/ });
      });

      cy.contains('button', 'Prev').then(($prev) => {
        if ($prev.is(':disabled')) {
          return;
        }
        cy.wrap($prev).click();
        cy.wait('@taiDanhSachPhongBan');
      });
    });
  });

  it('Validation required: thiếu dữ liệu thì không gửi POST', () => {
    vaoTrangPhongBan();
    cy.intercept('POST', '**/api/departments').as('taoPhongBan');

    cy.waitForOverlayToDisappear();
    clickButtonWhenReady('Add Department');

    cy.get('input[formcontrolname="departmentName"]').clear();
    cy.get('input[formcontrolname="departmentCode"]').clear();
    cy.contains('button', 'Add Department').last().should('be.disabled');

    cy.get('@taoPhongBan.all').should('have.length', 0);
  });

  it('Luồng Cancel ở form tạo mới không gửi POST', () => {
    vaoTrangPhongBan();
    cy.intercept('POST', '**/api/departments').as('taoPhongBan');

    cy.waitForOverlayToDisappear();
    clickButtonWhenReady('Add Department');

    cy.get('input[formcontrolname="departmentName"]').type(`Phong${Date.now()}`);
    clickButtonWhenReady('Cancel');

    cy.contains('Add New Department').should('not.exist');
    cy.get('@taoPhongBan.all').should('have.length', 0);
  });

  it('Submit hợp lệ form tạo mới gửi POST', () => {
    vaoTrangPhongBan();
    cy.intercept('POST', '**/api/departments').as('taoPhongBan');

    cy.waitForOverlayToDisappear();
    clickButtonWhenReady('Add Department');

    cy.get('input[formcontrolname="departmentName"]').type(`Phong E2E ${Date.now()}`);
    cy.get('input[formcontrolname="departmentCode"]').type(`E2E${Date.now().toString().slice(-4)}`);
    cy.contains('button', 'Add Department').last().click();

    cy.wait('@taoPhongBan').then(({ request, response }) => {
      expect(request.body).to.have.property('departmentName');
      expect(request.body).to.have.property('departmentCode');
      expect([200, 201, 400, 403, 409, 422]).to.include(response?.statusCode ?? 0);
    });
  });

  it('Edit: mở modal sửa và cancel thì không gửi PUT', () => {
    vaoTrangPhongBan();
    cy.intercept('PUT', '**/api/departments/*').as('capNhatPhongBan');

    cy.get('body').then(($body) => {
      if ($body.find('button[title="Edit"]').length === 0) {
        cy.log('Không có bản ghi để sửa');
        return;
      }

      clickFirstWhenReady('button[title="Edit"]');
      cy.contains('Edit Department').should('be.visible');
      clickButtonWhenReady('Cancel');
      cy.get('@capNhatPhongBan.all').should('have.length', 0);
    });
  });

  it('Edit: cập nhật hợp lệ gửi PUT', () => {
    vaoTrangPhongBan();
    cy.intercept('PUT', '**/api/departments/*').as('capNhatPhongBan');

    cy.get('body').then(($body) => {
      if ($body.find('button[title="Edit"]').length === 0) {
        cy.log('Không có bản ghi để cập nhật');
        return;
      }

      clickFirstWhenReady('button[title="Edit"]');
      cy.get('input[formcontrolname="departmentName"]').clear().type(`Cap nhat ${Date.now()}`);
      cy.contains('button', 'Save Changes').click();

      cy.wait('@capNhatPhongBan').then(({ request, response }) => {
        expect(request.body).to.have.property('departmentName');
        expect([200, 204, 400, 403, 422]).to.include(response?.statusCode ?? 0);
      });
    });
  });

  it('Delete: xác nhận xóa gửi DELETE đúng', () => {
    vaoTrangPhongBan();
    cy.intercept('DELETE', '**/api/departments/*').as('xoaPhongBan');

    cy.get('body').then(($body) => {
      if ($body.find('button[title="Delete"]').length === 0) {
        cy.log('Không có bản ghi để xóa');
        return;
      }

      clickFirstWhenReady('button[title="Delete"]');
      cy.contains('Delete Department').should('be.visible');
      clickButtonWhenReady('Delete Department');

      cy.wait('@xoaPhongBan').then(({ response }) => {
        expect([200, 204, 403, 404]).to.include(response?.statusCode ?? 0);
      });
    });
  });

  it('Permission/Error/Empty: gặp 403/500/204 vẫn giữ session và không crash', () => {
    cy.intercept('GET', '**/api/departments?**').as('taiDanhSachPhongBan');

    cy.visit('/hrm/departments');
    cy.wait('@taiDanhSachPhongBan').then(({ response }) => {
      const status = response?.statusCode ?? 0;

      if (status === 403) {
        cy.contains('Unable to load department data. Please try again.').should('be.visible');
      }

      if (status >= 500) {
        cy.contains('Department Management').should('be.visible');
      }

      cy.get('body').then(($body) => {
        if ($body.text().includes('No departments found.')) {
          cy.contains('No departments found.').should('be.visible');
        }
      });

      cy.url().should('not.include', '/login');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('ams.accessToken')).to.be.a('string').and.not.be.empty;
      });
    });
  });
});
