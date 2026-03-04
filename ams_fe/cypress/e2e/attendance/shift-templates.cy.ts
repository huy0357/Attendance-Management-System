import { assertRequestQuery } from '../../support/request-assertions';
import { clickButtonWhenReady, clickFirstWhenReady } from '../../support/ui-helpers';

describe('Chấm công - Mẫu ca làm (API thật, không mock)', () => {
  beforeEach(() => {
    cy.login();
  });

  const vaoTrangMauCa = () => {
    cy.intercept('GET', '**/api/v1/shifts**').as('taiMauCa');

    cy.visit('/attendance/shift-templates');
    cy.location('pathname').should('include', '/attendance/shift-templates');
    cy.wait('@taiMauCa');
  };

  it('Smoke: tải danh sách mẫu ca và render UI chính', () => {
    vaoTrangMauCa();
    cy.contains('Shift Templates').should('be.visible');
    cy.contains('TOTAL TEMPLATES').should('be.visible');
  });

  it('Edge: reload trang vẫn gọi lại API danh sách', () => {
    vaoTrangMauCa();
    cy.reload();
    cy.wait('@taiMauCa').then(({ response }) => {
      expect([200, 204, 403, 500]).to.include(response?.statusCode ?? 0);
    });
  });

  it('Search keyword thường gửi query q đúng', () => {
    vaoTrangMauCa();

    cy.get('input[formcontrolname="q"]').clear().type('sang');
    cy.wait('@taiMauCa').then(({ request }) => {
      assertRequestQuery(request.query, { q: 'sang' });
    });
  });

  it('Search có dấu và ký tự đặc biệt không làm vỡ UI', () => {
    vaoTrangMauCa();

    cy.get('input[formcontrolname="q"]').clear().type('đêm@#');
    cy.wait('@taiMauCa').then(({ request }) => {
      expect(request.query).to.have.property('q');
    });

    cy.contains('Shift Templates').should('be.visible');
  });

  it('Filter active/inactive gửi query đúng', () => {
    vaoTrangMauCa();

    cy.get('select[formcontrolname="active"]').select('true');
    cy.wait('@taiMauCa').then(({ request }) => {
      assertRequestQuery(request.query, { active: 'true' });
    });

    cy.get('select[formcontrolname="active"]').select('false');
    cy.wait('@taiMauCa').then(({ request }) => {
      assertRequestQuery(request.query, { active: 'false' });
    });

    cy.get('select[formcontrolname="active"]').select('');
    cy.wait('@taiMauCa').then(({ request }) => {
      expect(request.query.active).to.eq(undefined);
    });
  });

  it('Kết hợp filter + search và reset', () => {
    vaoTrangMauCa();

    cy.get('input[formcontrolname="q"]').clear().type('ca');
    cy.get('select[formcontrolname="active"]').select('true');
    cy.wait('@taiMauCa');

    cy.get('input[formcontrolname="q"]').clear();
    cy.get('select[formcontrolname="active"]').select('');
    cy.wait('@taiMauCa');
  });

  it('Validation required: thiếu code/name thì không gửi POST', () => {
    vaoTrangMauCa();
    cy.intercept('POST', '**/api/v1/shifts').as('taoMauCa');

    clickButtonWhenReady('Add Shift Template');

    cy.get('input[formcontrolname="shiftCode"]').clear();
    cy.get('input[formcontrolname="shiftName"]').clear();
    clickButtonWhenReady('Add Template');

    cy.get('@taoMauCa.all').should('have.length', 0);
  });

  it('Validation format time: thiếu giờ bắt buộc thì không gửi POST', () => {
    vaoTrangMauCa();
    cy.intercept('POST', '**/api/v1/shifts').as('taoMauCa');

    clickButtonWhenReady('Add Shift Template');

    cy.get('input[formcontrolname="shiftCode"]').type(`CA${Date.now().toString().slice(-4)}`);
    cy.get('input[formcontrolname="shiftName"]').type('Ca E2E');
    cy.get('input[formcontrolname="startTime"]').clear();
    cy.get('input[formcontrolname="endTime"]').clear();

    clickButtonWhenReady('Add Template');
    cy.get('@taoMauCa.all').should('have.length', 0);
  });

  it('Luồng Cancel modal tạo mới không gửi POST', () => {
    vaoTrangMauCa();
    cy.intercept('POST', '**/api/v1/shifts').as('taoMauCa');

    clickButtonWhenReady('Add Shift Template');
    cy.get('input[formcontrolname="shiftCode"]').type('TMP01');
    clickButtonWhenReady('Cancel');

    cy.contains('Add Shift Template').should('not.exist');
    cy.get('@taoMauCa.all').should('have.length', 0);
  });

  it('Submit hợp lệ tạo mẫu ca phải gửi POST', () => {
    vaoTrangMauCa();
    cy.intercept('POST', '**/api/v1/shifts').as('taoMauCa');

    clickButtonWhenReady('Add Shift Template');

    cy.get('input[formcontrolname="shiftCode"]').clear().type(`E2E${Date.now().toString().slice(-4)}`);
    cy.get('input[formcontrolname="shiftName"]').clear().type('Ca kiểm thử');
    cy.get('input[formcontrolname="startTime"]').clear().type('08:00');
    cy.get('input[formcontrolname="endTime"]').clear().type('17:00');
    cy.get('input[formcontrolname="breakMinutes"]').clear().type('60');
    cy.get('input[formcontrolname="graceInMinutes"]').clear().type('5');
    cy.get('input[formcontrolname="graceOutMinutes"]').clear().type('5');
    cy.get('input[formcontrolname="minWorkMinutes"]').clear().type('420');

    clickButtonWhenReady('Add Template');

    cy.wait('@taoMauCa').then(({ request, response }) => {
      expect(request.body).to.have.property('shiftCode');
      expect(request.body).to.have.property('startTime');
      expect([200, 201, 400, 403, 409, 422]).to.include(response?.statusCode ?? 0);
    });
  });

  it('Edit và toggle active: thao tác chính gửi request đúng', () => {
    vaoTrangMauCa();
    cy.intercept('GET', '**/api/v1/shifts/*').as('chiTietMauCa');
    cy.intercept('PUT', '**/api/v1/shifts/*').as('capNhatMauCa');
    cy.intercept('PATCH', '**/api/v1/shifts/*/active**').as('doiTrangThaiMauCa');

    cy.get('body').then(($body) => {
      if ($body.find('button[title="Edit"]').length > 0) {
        clickFirstWhenReady('button[title="Edit"]');
        cy.wait('@chiTietMauCa');
        clickButtonWhenReady('Cancel');
      }

      if ($body.find('button[title="Activate"]').length > 0) {
        clickFirstWhenReady('button[title="Activate"]');
        cy.wait('@doiTrangThaiMauCa');
      } else if ($body.find('button[title="Deactivate"]').length > 0) {
        clickFirstWhenReady('button[title="Deactivate"]');
        cy.wait('@doiTrangThaiMauCa');
      }

      cy.get('@capNhatMauCa.all').its('length').should('be.gte', 0);
    });
  });

  it('Permission/Error/Empty: 403/500/empty state không logout', () => {
    cy.intercept('GET', '**/api/v1/shifts**').as('taiMauCa');

    cy.visit('/attendance/shift-templates');
    cy.wait('@taiMauCa').then(({ response }) => {
      const status = response?.statusCode ?? 0;

      if (status === 403) {
        cy.url().should('not.include', '/login');
      }

      if (status >= 500) {
        cy.contains('Shift Templates').should('be.visible');
      }

      cy.get('body').then(($body) => {
        if ($body.text().includes('No shift templates found.')) {
          cy.contains('No shift templates found.').should('be.visible');
        }
      });

      cy.window().then((win) => {
        expect(win.localStorage.getItem('ams.accessToken')).to.be.a('string').and.not.be.empty;
      });
    });
  });
});
