import type { AuthTokens } from '../../support/commands';

const duongDanLogin = '/login';
const apiLogin = '**/api/auth/login';
const apiRefresh = '**/api/auth/refresh';

const layThongTinDangNhap = () => {
  const username = Cypress.env('E2E_USERNAME');
  const password = Cypress.env('E2E_PASSWORD');
  if (!username || !password) {
    throw new Error('Thiếu CYPRESS_E2E_USERNAME hoặc CYPRESS_E2E_PASSWORD');
  }
  return { username: String(username), password: String(password) };
};

const nhapThongTin = (username: string, password: string) => {
  cy.get('#username').clear().type(username);
  cy.get('#password').clear().type(password);
};

describe('Đăng nhập - Toàn bộ luồng', () => {
  beforeEach(() => {
    cy.visit(duongDanLogin);
  });

  describe('Giao diện', () => {
    it('Hiển thị đủ input username và password', () => {
      cy.get('#username').should('be.visible');
      cy.get('#password').should('be.visible');
    });

    it('Nút đăng nhập bị vô hiệu khi form không hợp lệ', () => {
      cy.get('button[type="submit"]').should('be.disabled');
    });

    it('Nút đăng nhập được bật khi form hợp lệ', () => {
      const { username, password } = layThongTinDangNhap();
      nhapThongTin(username, password);
      cy.get('button[type="submit"]').should('not.be.disabled');
    });
  });

  describe('Validation', () => {
    it('Hiển thị lỗi khi username để trống', () => {
      cy.intercept('POST', apiLogin).as('dangNhap');
      nhapThongTin('', 'mat-khau-bat-ky');
      cy.get('button[type="submit"]').click();
      cy.contains('Please enter valid credentials').should('be.visible');
      cy.get('@dangNhap.all').should('have.length', 0);
    });

    it('Hiển thị lỗi khi password để trống', () => {
      cy.intercept('POST', apiLogin).as('dangNhap');
      nhapThongTin('user-bat-ky', '');
      cy.get('button[type="submit"]').click();
      cy.contains('Please enter valid credentials').should('be.visible');
      cy.get('@dangNhap.all').should('have.length', 0);
    });

    it('Hiển thị lỗi khi username nhỏ hơn 3 ký tự', () => {
      cy.intercept('POST', apiLogin, { statusCode: 400, body: { message: 'Invalid username' } }).as('dangNhap');
      nhapThongTin('ab', 'mat-khau-bat-ky');
      cy.get('button[type="submit"]').click();
      cy.wait('@dangNhap');
      cy.contains('Login failed. Please check your credentials.').should('be.visible');
    });

    it('Hiển thị lỗi khi password nhỏ hơn 6 ký tự', () => {
      cy.intercept('POST', apiLogin, { statusCode: 400, body: { message: 'Invalid password' } }).as('dangNhap');
      nhapThongTin('user-bat-ky', '12345');
      cy.get('button[type="submit"]').click();
      cy.wait('@dangNhap');
      cy.contains('Login failed. Please check your credentials.').should('be.visible');
    });

    it('Hiển thị lỗi khi chỉ nhập khoảng trắng', () => {
      cy.intercept('POST', apiLogin, { statusCode: 400, body: { message: 'Invalid input' } }).as('dangNhap');
      nhapThongTin('   ', '      ');
      cy.get('button[type="submit"]').click();
      cy.wait('@dangNhap');
      cy.contains('Login failed. Please check your credentials.').should('be.visible');
    });

    it('Hiển thị lỗi khi blur không nhập rồi submit', () => {
      cy.get('#username').focus().blur();
      cy.get('#password').focus().blur();
      cy.get('button[type="submit"]').click();
      cy.contains('Please enter valid credentials').should('be.visible');
    });

    it('Không gửi nhiều request khi submit liên tiếp', () => {
      cy.intercept('POST', apiLogin, {
        delay: 800,
        statusCode: 401,
        body: { message: 'Unauthorized' },
      }).as('dangNhap');

      nhapThongTin('user-bat-ky', 'mat-khau-bat-ky');
      cy.get('button[type="submit"]').click();
      cy.get('button[type="submit"]').click({ force: true });
      cy.get('button[type="submit"]').click({ force: true });
      cy.wait('@dangNhap');
      cy.get('@dangNhap.all').should('have.length', 1);
      cy.contains('Login failed. Please check your credentials.').should('be.visible');
    });
  });

  describe('API /api/auth/login', () => {
    it('Gửi đúng method, URL và body không có field thừa', () => {
      const { username, password } = layThongTinDangNhap();
      cy.intercept('POST', apiLogin).as('dangNhap');
      nhapThongTin(username, password);
      cy.get('button[type="submit"]').click();

      cy.wait('@dangNhap').then(({ request, response }) => {
        expect(request.method).to.eq('POST');
        expect(request.url).to.include('/api/auth/login');
        expect(request.body).to.deep.equal({ username, password });
        expect(Object.keys(request.body)).to.have.length(2);
        expect(response?.statusCode).to.eq(200);
      });
    });

    it('Hiển thị lỗi khi server trả 401', () => {
      cy.intercept('POST', apiLogin, { statusCode: 401, body: { message: 'Unauthorized' } }).as('dangNhap');
      nhapThongTin('sai-user', 'sai-pass');
      cy.get('button[type="submit"]').click();
      cy.wait('@dangNhap');
      cy.contains('Login failed. Please check your credentials.').should('be.visible');
      cy.url().should('include', '/login');
    });

    it('Hiển thị lỗi khi server trả 403', () => {
      cy.intercept('POST', apiLogin, { statusCode: 403, body: { message: 'Forbidden' } }).as('dangNhap');
      nhapThongTin('sai-user', 'sai-pass');
      cy.get('button[type="submit"]').click();
      cy.wait('@dangNhap');
      cy.contains('Login failed. Please check your credentials.').should('be.visible');
      cy.url().should('include', '/login');
    });

    it('Hiển thị lỗi khi server down (status 0)', () => {
      cy.intercept('POST', apiLogin, { forceNetworkError: true }).as('dangNhap');
      nhapThongTin('user', 'pass');
      cy.get('button[type="submit"]').click();
      cy.wait('@dangNhap');
      cy.contains('Login failed. Please check your credentials.').should('be.visible');
    });

    it('Hiển thị trạng thái loading khi phản hồi chậm', () => {
      cy.intercept('POST', apiLogin, {
        delay: 1200,
        statusCode: 401,
        body: { message: 'Unauthorized' },
      }).as('dangNhap');

      nhapThongTin('user', 'pass');
      cy.get('button[type="submit"]').click();
      cy.contains('Signing in...').should('be.visible');
      cy.wait('@dangNhap');
      cy.contains('Login failed. Please check your credentials.').should('be.visible');
    });
  });

  describe('Đăng nhập thành công', () => {
    it('Lưu accessToken, điều hướng đúng và có Authorization ở request protected', () => {
      const { username, password } = layThongTinDangNhap();
      cy.intercept('POST', apiLogin).as('dangNhap');
      nhapThongTin(username, password);
      cy.get('button[type="submit"]').click();

      cy.wait('@dangNhap').then(({ response }) => {
        expect(response?.statusCode).to.eq(200);
        const body = response?.body || {};
        const accessToken = body.accessToken as string | undefined;
        const role = (body.role as string | undefined)?.toUpperCase?.() || '';

        expect(accessToken, 'access token').to.be.a('string').and.not.be.empty;

        cy.window().then((win) => {
          expect(win.localStorage.getItem('ams.accessToken')).to.eq(body.accessToken);
          expect(win.localStorage.getItem('ams.refreshToken')).to.eq(body.refreshToken);
          expect(win.localStorage.getItem('ams.username')).to.eq(body.username);
          expect(win.localStorage.getItem('ams.role')).to.eq(body.role);
        });

        cy.url().should('include', '/dashboard');

        const duongDanBaoVe = role === 'ADMIN' ? '/admin/account-management' : '/hrm/employees';
        const apiBaoVe = role === 'ADMIN' ? '**/api/accounts/page**' : '**/api/employees/page**';

        cy.intercept('GET', apiBaoVe).as('apiBaoVe');
        cy.visit(duongDanBaoVe);
        cy.wait('@apiBaoVe').then((interception) => {
          expect(interception.request.headers.authorization).to.eq(`Bearer ${accessToken}`);
        });
      });
    });
  });

  describe('Refresh token', () => {
    it('Gặp 401 ở API protected thì gọi refresh và retry request', () => {
      const tokenCu: AuthTokens = {
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        username: 'admin',
        role: 'ADMIN',
        expiresInSeconds: 3600,
      };

      const tokenMoi = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        tokenType: 'Bearer',
        expiresInSeconds: 3600,
        username: 'admin',
        role: 'ADMIN',
      };

      const duLieuTaiKhoan = {
        items: [
          {
            accountId: 1,
            username: 'qa-user',
            role: 'ADMIN',
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            lastLoginAt: '2026-01-02T00:00:00Z',
          },
        ],
        totalItems: 1,
        totalPages: 1,
      };

      let soLanGoi = 0;
      cy.intercept('GET', '**/api/accounts/page**', (req) => {
        soLanGoi += 1;
        if (soLanGoi === 1) {
          req.reply({ statusCode: 401, body: { message: 'Unauthorized' } });
          return;
        }
        expect(req.headers.authorization).to.eq(`Bearer ${tokenMoi.accessToken}`);
        req.reply({ statusCode: 200, body: duLieuTaiKhoan });
      }).as('taiKhoanPage');

      cy.intercept('POST', apiRefresh, (req) => {
        expect(req.body).to.deep.equal({ refreshToken: tokenCu.refreshToken });
        req.reply({ statusCode: 200, body: tokenMoi });
      }).as('lamMoiToken');

      cy.thamTrangCoAuth('/admin/account-management', tokenCu);
      cy.wait('@taiKhoanPage');
      cy.wait('@lamMoiToken');
      cy.wait('@taiKhoanPage');
      cy.contains('qa-user').should('be.visible');
    });

    it('Không refresh khi gọi /api/auth/*', () => {
      cy.intercept('POST', apiRefresh).as('lamMoiToken');
      cy.intercept('POST', apiLogin, { statusCode: 401, body: { message: 'Unauthorized' } }).as('dangNhap');
      nhapThongTin('sai-user', 'sai-pass');
      cy.get('button[type="submit"]').click();
      cy.wait('@dangNhap');
      cy.get('@lamMoiToken.all').should('have.length', 0);
    });

    it('Refresh thất bại thì quay về trang login', () => {
      const tokenCu: AuthTokens = {
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        username: 'admin',
        role: 'ADMIN',
        expiresInSeconds: 3600,
      };

      cy.intercept('GET', '**/api/accounts/page**', { statusCode: 401, body: { message: 'Unauthorized' } }).as(
        'taiKhoanPage',
      );
      cy.intercept('POST', apiRefresh, { statusCode: 401, body: { message: 'Refresh failed' } }).as('lamMoiToken');

      cy.thamTrangCoAuth('/admin/account-management', tokenCu);
      cy.wait('@taiKhoanPage');
      cy.wait('@lamMoiToken');
      cy.url().should('include', '/login');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('ams.accessToken')).to.be.null;
        expect(win.localStorage.getItem('ams.refreshToken')).to.be.null;
      });
    });
  });
});
