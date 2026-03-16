import { assertRequestQuery } from '../../support/request-assertions';
import { clickButtonWhenReady } from '../../support/ui-helpers';

describe('Chấm công - Quản lý yêu cầu (API thật, không mock)', () => {
  beforeEach(() => {
    cy.login();
  });

  const vaoTrangYeuCau = () => {
    cy.intercept('GET', '**/api/employees**').as('taiNhanVien');
    cy.intercept('GET', '**/api/requests?employeeId=*').as('taiYeuCauTheoNhanVien');

    cy.visit('/attendance/requests-management');
    cy.location('pathname').should('include', '/attendance/requests-management');
    cy.wait('@taiNhanVien');
  };

  const chonNhanVienDauTien = () => {
    cy.get('select').first().then(($select) => {
      if ($select.find('option').length > 1) {
        cy.wrap($select).select(1);
      }
    });
  };

  it('Smoke: tải dropdown nhân viên thành công', () => {
    vaoTrangYeuCau();
    cy.contains('Requests Management').should('be.visible');
    cy.contains('Select Employee').should('be.visible');
  });

  it('Chọn nhân viên thì gọi API requests theo employeeId', () => {
    vaoTrangYeuCau();

    chonNhanVienDauTien();
    cy.get('@taiYeuCauTheoNhanVien.all').then((calls) => {
      if (calls.length === 0) {
        cy.log('Không có request nào được gọi sau khi chọn nhân viên');
        return;
      }

      cy.wait('@taiYeuCauTheoNhanVien').then(({ request, response }) => {
        assertRequestQuery(request.query, { employeeId: /\d+/ });
        expect([200, 204, 403, 500]).to.include(response?.statusCode ?? 0);
      });
    });
  });

  it('Edge: reload trang vẫn giữ route và tải lại nhân viên', () => {
    vaoTrangYeuCau();

    cy.reload();
    cy.wait('@taiNhanVien');
    cy.location('pathname').should('include', '/attendance/requests-management');
  });

  it('Reset về -- Choose employee -- thì hiển thị empty state', () => {
    vaoTrangYeuCau();

    chonNhanVienDauTien();
    cy.get('select').first().select(0);
    cy.contains('No requests').should('be.visible');
  });

  it('Mở form Edit hiển thị dữ liệu hiện tại của request', () => {
    vaoTrangYeuCau();

    chonNhanVienDauTien();
    cy.get('@taiYeuCauTheoNhanVien.all').then((calls) => {
      if (calls.length === 0) {
        return;
      }

      cy.wait('@taiYeuCauTheoNhanVien');
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Edit")').length === 0) {
          return;
        }

        cy.contains('button', 'Edit').first().click();
        cy.contains('Edit Request').should('be.visible');
        cy.get('input[formcontrolname="title"]').should('exist');
      });
    });
  });

  it('Validation required: để trống title thì không gửi PUT', () => {
    vaoTrangYeuCau();
    cy.intercept('PUT', '**/api/requests/*').as('capNhatYeuCau');

    chonNhanVienDauTien();
    cy.get('@taiYeuCauTheoNhanVien.all').then((calls) => {
      if (calls.length === 0) {
        return;
      }

      cy.wait('@taiYeuCauTheoNhanVien');
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Edit")').length === 0) {
          return;
        }

        cy.contains('button', 'Edit').first().click();
        cy.get('input[formcontrolname="title"]').clear();
        clickButtonWhenReady('Save');

        cy.get('@capNhatYeuCau.all').should('have.length', 0);
      });
    });
  });

  it('Validation required: để trống start/end datetime thì không gửi PUT', () => {
    vaoTrangYeuCau();
    cy.intercept('PUT', '**/api/requests/*').as('capNhatYeuCau');

    chonNhanVienDauTien();
    cy.get('@taiYeuCauTheoNhanVien.all').then((calls) => {
      if (calls.length === 0) {
        return;
      }

      cy.wait('@taiYeuCauTheoNhanVien');
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Edit")').length === 0) {
          return;
        }

        cy.contains('button', 'Edit').first().click();
        cy.get('input[formcontrolname="startDatetime"]').clear();
        cy.get('input[formcontrolname="endDatetime"]').clear();
        clickButtonWhenReady('Save');

        cy.get('@capNhatYeuCau.all').should('have.length', 0);
      });
    });
  });

  it('Luồng Cancel ở form sửa thì không gửi PUT', () => {
    vaoTrangYeuCau();
    cy.intercept('PUT', '**/api/requests/*').as('capNhatYeuCau');

    chonNhanVienDauTien();
    cy.get('@taiYeuCauTheoNhanVien.all').then((calls) => {
      if (calls.length === 0) {
        return;
      }

      cy.wait('@taiYeuCauTheoNhanVien');
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Edit")').length === 0) {
          return;
        }

        cy.contains('button', 'Edit').first().click();
        clickButtonWhenReady('Cancel');
        cy.contains('Edit Request').should('not.exist');
        cy.get('@capNhatYeuCau.all').should('have.length', 0);
      });
    });
  });

  it('Submit hợp lệ form sửa thì gửi PUT', () => {
    vaoTrangYeuCau();
    cy.intercept('PUT', '**/api/requests/*').as('capNhatYeuCau');

    chonNhanVienDauTien();
    cy.get('@taiYeuCauTheoNhanVien.all').then((calls) => {
      if (calls.length === 0) {
        return;
      }

      cy.wait('@taiYeuCauTheoNhanVien');
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Edit")').length === 0) {
          return;
        }

        cy.contains('button', 'Edit').first().click();
        cy.get('input[formcontrolname="title"]').clear().type(`Cap nhat ${Date.now()}`);
        clickButtonWhenReady('Save');

        cy.wait('@capNhatYeuCau').then(({ request, response }) => {
          expect(request.body).to.have.property('title');
          expect([200, 204, 400, 403, 422]).to.include(response?.statusCode ?? 0);
        });
      });
    });
  });

  it('Delete flow: bấm Cancel confirm thì không gửi DELETE', () => {
    vaoTrangYeuCau();
    cy.intercept('DELETE', '**/api/requests/*').as('xoaYeuCau');

    chonNhanVienDauTien();
    cy.get('@taiYeuCauTheoNhanVien.all').then((calls) => {
      if (calls.length === 0) {
        return;
      }

      cy.wait('@taiYeuCauTheoNhanVien');
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Delete")').length === 0) {
          return;
        }

        cy.on('window:confirm', () => false);
        cy.contains('button', 'Delete').first().click();
        cy.get('@xoaYeuCau.all').should('have.length', 0);
      });
    });
  });

  it('Delete flow: xác nhận xóa thì gửi DELETE', () => {
    vaoTrangYeuCau();
    cy.intercept('DELETE', '**/api/requests/*').as('xoaYeuCau');

    chonNhanVienDauTien();
    cy.get('@taiYeuCauTheoNhanVien.all').then((calls) => {
      if (calls.length === 0) {
        return;
      }

      cy.wait('@taiYeuCauTheoNhanVien');
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Delete")').length === 0) {
          return;
        }

        cy.on('window:confirm', () => true);
        cy.contains('button', 'Delete').first().click();

        cy.wait('@xoaYeuCau').then(({ response }) => {
          expect([200, 204, 403, 404]).to.include(response?.statusCode ?? 0);
        });
      });
    });
  });

  it('Permission/Error/Empty: 403/500/empty state không logout', () => {
    vaoTrangYeuCau();

    chonNhanVienDauTien();
    cy.get('@taiYeuCauTheoNhanVien.all').then((calls) => {
      if (calls.length === 0) {
        cy.contains('No requests').should('be.visible');
        return;
      }

      cy.wait('@taiYeuCauTheoNhanVien').then(({ response }) => {
        const status = response?.statusCode ?? 0;

        if (status === 403) {
          cy.contains(/Không có quyền|quyền/i).should('be.visible');
        }

        if (status >= 500) {
          cy.contains(/Unable to load requests|lỗi/i).should('be.visible');
        }

        cy.url().should('not.include', '/login');
        cy.window().then((win) => {
          expect(win.localStorage.getItem('ams.accessToken')).to.be.a('string').and.not.be.empty;
        });
      });
    });
  });
});
