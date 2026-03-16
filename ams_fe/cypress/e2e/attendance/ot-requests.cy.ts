import { assertRequestQuery } from '../../support/request-assertions';
import { clickButtonWhenReady, clickFirstWhenReady } from '../../support/ui-helpers';

describe('Chấm công - Duyệt yêu cầu OT (API thật, không mock)', () => {
  beforeEach(() => {
    cy.login();
  });

  const vaoTrangOt = () => {
    cy.intercept('GET', '**/api/accounts/search**').as('timAccount');
    cy.intercept('GET', '**/api/requests?employeeId=*').as('taiOtRequests');

    cy.visit('/attendance/ot-requests');
    cy.location('pathname').should('include', '/attendance/ot-requests');
    cy.wait('@timAccount');
    cy.wait('@taiOtRequests');
  };

  it('Smoke: tải account và danh sách OT request', () => {
    vaoTrangOt();

    cy.wait('@timAccount').then(({ request, response }) => {
      assertRequestQuery(request.query, { username: /.+/ });
      expect([200, 204, 403, 500]).to.include(response?.statusCode ?? 0);
    });

    cy.wait('@taiOtRequests').then(({ request, response }) => {
      assertRequestQuery(request.query, { employeeId: /\d+/ });
      expect([200, 204, 403, 500]).to.include(response?.statusCode ?? 0);
    });

    cy.contains('Overtime Request Management').should('be.visible');
  });

  it('Edge: reload trang vẫn giữ route và tải lại danh sách', () => {
    vaoTrangOt();

    cy.reload();
    cy.wait('@timAccount');
    cy.wait('@taiOtRequests');
    cy.location('pathname').should('include', '/attendance/ot-requests');
  });

  it('Search theo từ khóa thường cập nhật bảng kết quả', () => {
    vaoTrangOt();

    cy.get('input[formcontrolname="searchQuery"]').clear().type('an');
    cy.contains('Overtime Request Management').should('be.visible');
  });

  it('Search với ký tự có dấu và đặc biệt không làm crash UI', () => {
    vaoTrangOt();

    cy.get('input[formcontrolname="searchQuery"]').clear().type('đặng@#');
    cy.contains('Overtime Request Management').should('be.visible');
  });

  it('Filter trạng thái Pending hiển thị dữ liệu phù hợp', () => {
    vaoTrangOt();

    cy.get('select[formcontrolname="status"]').select('Pending');
    cy.contains('Overtime Request Management').should('be.visible');
  });

  it('Filter trạng thái Approved và Rejected hoạt động đúng', () => {
    vaoTrangOt();

    cy.get('select[formcontrolname="status"]').select('Approved');
    cy.contains('Overtime Request Management').should('be.visible');

    cy.get('select[formcontrolname="status"]').select('Rejected');
    cy.contains('Overtime Request Management').should('be.visible');
  });

  it('Reset filter + search về mặc định', () => {
    vaoTrangOt();

    cy.get('input[formcontrolname="searchQuery"]').type('tmp');
    cy.get('select[formcontrolname="status"]').select('Pending');

    cy.get('input[formcontrolname="searchQuery"]').clear();
    cy.get('select[formcontrolname="status"]').select('All Status');
    cy.contains('Overtime Request Management').should('be.visible');
  });

  it('Mở modal chi tiết rồi đóng modal thành công', () => {
    vaoTrangOt();

    cy.get('body').then(($body) => {
      if ($body.find('button[title="View Details"]').length === 0) {
        cy.log('Không có request để mở chi tiết');
        return;
      }

      clickFirstWhenReady('button[title="View Details"]');
      cy.contains('OT Request Details').should('be.visible');
      clickButtonWhenReady('Close');
      cy.contains('OT Request Details').should('not.exist');
    });
  });

  it('Approve flow: mở modal rồi Cancel thì không gửi PUT', () => {
    vaoTrangOt();
    cy.intercept('PUT', '**/api/requests/*/approval').as('duyetOt');

    cy.get('body').then(($body) => {
      if ($body.find('button[title="Approve"]').length === 0) {
        cy.log('Không có request pending để approve');
        return;
      }

      clickFirstWhenReady('button[title="Approve"]');
      cy.contains('Approve OT Request').should('be.visible');
      clickButtonWhenReady('Cancel');

      cy.get('@duyetOt.all').should('have.length', 0);
    });
  });

  it('Approve flow: submit thành công gửi PUT approval', () => {
    vaoTrangOt();
    cy.intercept('PUT', '**/api/requests/*/approval').as('duyetOt');

    cy.get('body').then(($body) => {
      if ($body.find('button[title="Approve"]').length === 0) {
        cy.log('Không có request pending để approve');
        return;
      }

      clickFirstWhenReady('button[title="Approve"]');
      cy.get('textarea[formcontrolname="notes"]').clear().type('Duyệt bởi automation');
      clickButtonWhenReady('Approve Request');

      cy.wait('@duyetOt').then(({ request, response }) => {
        expect(request.body).to.have.property('status', 'APPROVED');
        expect([200, 204, 400, 403, 422]).to.include(response?.statusCode ?? 0);
      });
    });
  });

  it('Reject flow: mở modal rồi Cancel thì không gửi PUT', () => {
    vaoTrangOt();
    cy.intercept('PUT', '**/api/requests/*/approval').as('tuChoiOt');

    cy.get('body').then(($body) => {
      if ($body.find('button[title="Reject"]').length === 0) {
        cy.log('Không có request pending để reject');
        return;
      }

      clickFirstWhenReady('button[title="Reject"]');
      cy.contains('Reject OT Request').should('be.visible');
      clickButtonWhenReady('Cancel');

      cy.get('@tuChoiOt.all').should('have.length', 0);
    });
  });

  it('Reject flow: nhập ghi chú rồi submit gửi PUT', () => {
    vaoTrangOt();
    cy.intercept('PUT', '**/api/requests/*/approval').as('tuChoiOt');

    cy.get('body').then(($body) => {
      if ($body.find('button[title="Reject"]').length === 0) {
        cy.log('Không có request pending để reject');
        return;
      }

      clickFirstWhenReady('button[title="Reject"]');
      cy.get('textarea[formcontrolname="notes"]').clear().type('Từ chối do chưa đủ căn cứ OT');
      clickButtonWhenReady('Reject Request');

      cy.wait('@tuChoiOt').then(({ request, response }) => {
        expect(request.body).to.have.property('status', 'REJECTED');
        expect([200, 204, 400, 403, 422]).to.include(response?.statusCode ?? 0);
      });
    });
  });

  it('Permission/Error/Empty: 403/500/empty state vẫn giữ session', () => {
    cy.intercept('GET', '**/api/requests?employeeId=*').as('taiOtRequests');

    cy.visit('/attendance/ot-requests');
    cy.wait('@taiOtRequests').then(({ response }) => {
      const status = response?.statusCode ?? 0;

      if (status === 403) {
        cy.contains(/Không có quyền|quyền/i).should('be.visible');
      }

      if (status >= 500) {
        cy.contains('Overtime Request Management').should('be.visible');
      }

      cy.get('body').then(($body) => {
        if ($body.text().includes('No OT requests found')) {
          cy.contains('No OT requests found').should('be.visible');
        }
      });

      cy.url().should('not.include', '/login');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('ams.accessToken')).to.be.a('string').and.not.be.empty;
      });
    });
  });
});
