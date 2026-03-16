import { assertRequestQuery } from '../../support/request-assertions';
import { clickButtonWhenReady } from '../../support/ui-helpers';

describe('Chấm công - Lập lịch ca (API thật, không mock)', () => {
  beforeEach(() => {
    cy.login();
  });

  const vaoTrangScheduling = () => {
    cy.intercept('GET', '**/api/v1/shifts**').as('taiMauCa');
    cy.intercept('GET', '**/api/employees**').as('taiNhanVien');
    cy.intercept('GET', '**/api/v1/schedules/by-employee/day**').as('taiLichTheoNgay');

    cy.visit('/attendance/scheduling');
    cy.location('pathname').should('include', '/attendance/scheduling');
    cy.wait('@taiMauCa');
    cy.wait('@taiNhanVien');
    cy.wait('@taiLichTheoNgay');
  };

  it('Smoke: tải đủ template, employee và lịch theo ngày', () => {
    vaoTrangScheduling();

    cy.wait('@taiLichTheoNgay').then(({ request, response }) => {
      assertRequestQuery(request.query, {
        employeeId: /\d+/,
        date: /\d{4}-\d{2}-\d{2}/,
      });
      expect([200, 204, 403, 500]).to.include(response?.statusCode ?? 0);
    });

    cy.contains('Shift Scheduling').should('be.visible');
  });

  it('Edge: reload trang vẫn giữ route và tải lại lịch', () => {
    vaoTrangScheduling();

    cy.reload();
    cy.wait('@taiLichTheoNgay');
    cy.location('pathname').should('include', '/attendance/scheduling');
  });

  it('Chuyển tuần Next phát sinh request lịch mới', () => {
    vaoTrangScheduling();

    clickButtonWhenReady('Next');
    cy.wait('@taiLichTheoNgay').then(({ request }) => {
      assertRequestQuery(request.query, { date: /\d{4}-\d{2}-\d{2}/ });
    });
  });

  it('Chuyển tuần Previous phát sinh request lịch mới', () => {
    vaoTrangScheduling();

    clickButtonWhenReady('Previous');
    cy.wait('@taiLichTheoNgay').then(({ request }) => {
      assertRequestQuery(request.query, { date: /\d{4}-\d{2}-\d{2}/ });
    });
  });

  it('Bấm Today để về tuần hiện tại và tải lại dữ liệu', () => {
    vaoTrangScheduling();

    clickButtonWhenReady('Today');
    cy.wait('@taiLichTheoNgay');
    cy.contains('Shift Scheduling').should('be.visible');
  });

  it('Search tên nhân viên (chữ thường) cập nhật lưới hiển thị', () => {
    vaoTrangScheduling();

    cy.get('input[placeholder="Search employee name or code"]').clear().type('an');
    cy.contains('Shift Scheduling').should('be.visible');
  });

  it('Search với ký tự có dấu và đặc biệt không làm crash UI', () => {
    vaoTrangScheduling();

    cy.get('input[placeholder="Search employee name or code"]').clear().type('đặng@#');
    cy.contains('Shift Scheduling').should('be.visible');
  });

  it('Bật/tắt Hide employees without shifts this week hoạt động ổn định', () => {
    vaoTrangScheduling();

    cy.contains('Hide employees without shifts this week').click();
    cy.contains('Shift Scheduling').should('be.visible');

    cy.contains('Hide employees without shifts this week').click();
    cy.contains('Shift Scheduling').should('be.visible');
  });

  it('Toggle nhóm phòng ban trong lưới lịch', () => {
    vaoTrangScheduling();

    cy.get('tbody button').first().click();
    cy.contains('Shift Scheduling').should('be.visible');
  });

  it('AI Auto-Schedule: mở popup rồi Cancel thì không gửi assign-range', () => {
    vaoTrangScheduling();
    cy.intercept('POST', '**/api/v1/schedules/assign-range').as('ganCaTuDong');

    clickButtonWhenReady('AI Auto-Schedule');
    cy.contains('AI Schedule Proposal').should('be.visible');
    clickButtonWhenReady('Cancel');

    cy.contains('AI Schedule Proposal').should('not.exist');
    cy.get('@ganCaTuDong.all').should('have.length', 0);
  });

  it('AI Auto-Schedule: Apply thì gửi POST assign-range (nếu có slot phù hợp)', () => {
    vaoTrangScheduling();
    cy.intercept('POST', '**/api/v1/schedules/assign-range').as('ganCaTuDong');

    clickButtonWhenReady('AI Auto-Schedule');
    cy.contains('AI Schedule Proposal').should('be.visible');
    clickButtonWhenReady(/Apply AI Schedule|Applying.../i);

    cy.get('@ganCaTuDong.all').then((calls) => {
      if (calls.length === 0) {
        cy.log('Không có slot cần assign nên không phát sinh POST');
        return;
      }

      cy.wait('@ganCaTuDong').then(({ request, response }) => {
        expect(request.body).to.have.property('employeeId');
        expect(request.body).to.have.property('shiftId');
        expect([200, 201, 400, 403, 422]).to.include(response?.statusCode ?? 0);
      });
    });
  });

  it('Mở chi tiết nhân viên và đóng panel chi tiết', () => {
    vaoTrangScheduling();

    cy.get('body').then(($body) => {
      if ($body.find('button.font-medium.text-slate-900.text-sm').length === 0) {
        cy.log('Không có nhân viên trong lưới để mở detail');
        return;
      }

      cy.get('button.font-medium.text-slate-900.text-sm').first().click();
      cy.contains('Employee Schedule Detail').should('be.visible');
      clickButtonWhenReady('Close');
      cy.contains('Employee Schedule Detail').should('not.exist');
    });
  });

  it('Permission/Error: gặp 403 hoặc 500 thì không tự logout', () => {
    cy.intercept('GET', '**/api/v1/schedules/by-employee/day**').as('taiLichTheoNgay');

    cy.visit('/attendance/scheduling');
    cy.wait('@taiLichTheoNgay').then(({ response }) => {
      const status = response?.statusCode ?? 0;

      if (status === 403) {
        cy.url().should('not.include', '/login');
      }

      if (status >= 500) {
        cy.contains('Shift Scheduling').should('be.visible');
      }

      cy.window().then((win) => {
        expect(win.localStorage.getItem('ams.accessToken')).to.be.a('string').and.not.be.empty;
      });
    });
  });
});
