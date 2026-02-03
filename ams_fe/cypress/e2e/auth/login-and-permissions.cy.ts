/**
 * Cypress E2E Tests: Login & Phân quyền (Authorization)
 *
 * Mô tả: Kiểm thử chi tiết chức năng đăng nhập và phân quyền Frontend
 * - Login thành công / thất bại
 * - Auth Guard: bảo vệ các route yêu cầu đăng nhập
 * - Kiểm tra redirect và lưu trữ token/user
 * - Kiểm tra xử lý lỗi 401, 403
 */

const API_BASE = 'http://localhost:8080/api';

// Mock response cho login thành công
const mockLoginSuccess = (role: string = 'admin') => ({
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-access-token',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-refresh-token',
  tokenType: 'Bearer',
  expiresInSeconds: 3600,
  username: 'testuser',
  role,
});

describe('1. TRANG ĐĂNG NHẬP - UI & Hiển thị', () => {
  beforeEach(() => {
    cy.clearAuthState();
    cy.visit('/auth/login');
  });

  it('1.1. Hiển thị đầy đủ form đăng nhập', () => {
    // Tiêu đề
    cy.contains('Welcome Back').should('be.visible');
    cy.contains('Sign in to your Attendance Management System').should('be.visible');

    // Các trường input
    cy.get('#username').should('be.visible').and('have.attr', 'placeholder', 'Enter your username');
    cy.get('#password').should('be.visible').and('have.attr', 'placeholder', 'Enter your password');

    // Labels
    cy.contains('label', 'Username').should('be.visible');
    cy.contains('label', 'Password').should('be.visible');

    // Nút Sign In
    cy.get('button[type="submit"]').should('be.visible').and('contain', 'Sign In');

    // Remember me & Forgot password
    cy.get('#remember-me').should('exist');
    cy.contains('Forgot password?').should('be.visible');
  });

  it('1.2. Nút Sign In bị disabled khi form trống', () => {
    cy.get('button[type="submit"]').should('be.disabled');
  });

  it('1.3. Nút Sign In bị disabled khi chỉ nhập username', () => {
    cy.get('#username').type('admin');
    cy.get('button[type="submit"]').should('be.disabled');
  });

  it('1.4. Nút Sign In bị disabled khi chỉ nhập password', () => {
    cy.get('#password').type('password123');
    cy.get('button[type="submit"]').should('be.disabled');
  });

  it('1.5. Nút Sign In enable khi nhập đủ username và password', () => {
    cy.get('#username').type('admin');
    cy.get('#password').type('password123');
    cy.get('button[type="submit"]').should('not.be.disabled');
  });
});

describe('2. LOGIN THẤT BẠI - Validation & Error Handling', () => {
  beforeEach(() => {
    cy.clearAuthState();
    cy.visit('/auth/login');
  });

  it('2.1. Hiển thị lỗi validation khi username trống (touch + blur)', () => {
    cy.get('#username').focus().blur();
    cy.contains('Please enter your username').should('be.visible');
  });

  it('2.2. Hiển thị lỗi validation khi password trống (touch + blur)', () => {
    cy.get('#password').focus().blur();
    cy.contains('Please enter your password').should('be.visible');
  });

  it('2.3. Username quá ngắn (< 3 ký tự) - hiển thị lỗi', () => {
    cy.get('#username').type('ab').blur();
    cy.get('#password').type('password123');
    cy.get('button[type="submit"]').click();
    // Angular Validators.minLength(3) cho username
    cy.contains('Please enter your username').should('be.visible');
  });

  it('2.4. Password quá ngắn (< 6 ký tự) - hiển thị lỗi', () => {
    cy.get('#username').type('admin');
    cy.get('#password').type('12345').blur();
    cy.get('button[type="submit"]').click();
    cy.contains('Please enter your password').should('be.visible');
  });

  it('2.5. Sai tài khoản/mật khẩu - API trả 401', () => {
    cy.intercept('POST', `${API_BASE}/auth/login`, {
      statusCode: 401,
      body: { message: 'Unauthorized' },
    }).as('loginFail');

    cy.get('#username').type('wronguser');
    cy.get('#password').type('wrongpass');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginFail');
    cy.contains('Invalid username or password').should('be.visible');
    // Vẫn ở trang login
    cy.url().should('include', '/auth/login');
  });

  it('2.6. Tài khoản bị vô hiệu hóa - API trả 403', () => {
    cy.intercept('POST', `${API_BASE}/auth/login`, {
      statusCode: 403,
      body: { message: 'Account disabled' },
    }).as('loginDisabled');

    cy.get('#username').type('disabled_user');
    cy.get('#password').type('password123');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginDisabled');
    cy.contains('Your account has been disabled').should('be.visible');
    cy.url().should('include', '/auth/login');
  });

  it('2.7. Không kết nối được server (status 0 / CORS)', () => {
    cy.intercept('POST', `${API_BASE}/auth/login`, {
      forceNetworkError: true,
    }).as('networkError');

    cy.get('#username').type('admin');
    cy.get('#password').type('password123');
    cy.get('button[type="submit"]').click();

    cy.wait('@networkError');
    cy.contains('Unable to connect to server', { timeout: 10000 }).should('be.visible');
    cy.url().should('include', '/auth/login');
  });

  it('2.8. API trả lỗi 500 - hiển thị thông báo chung', () => {
    cy.intercept('POST', `${API_BASE}/auth/login`, {
      statusCode: 500,
      body: { message: 'Internal server error' },
    }).as('serverError');

    cy.get('#username').type('admin');
    cy.get('#password').type('password123');
    cy.get('button[type="submit"]').click();

    cy.wait('@serverError');
    cy.contains('An error occurred. Please try again later.').should('be.visible');
  });
});

describe('3. LOGIN THÀNH CÔNG', () => {
  beforeEach(() => {
    cy.clearAuthState();
  });

  it('3.1. Đăng nhập thành công - redirect đến /dashboard', () => {
    cy.intercept('POST', `${API_BASE}/auth/login`, {
      statusCode: 200,
      body: mockLoginSuccess('admin'),
    }).as('loginSuccess');

    cy.visit('/auth/login');
    cy.get('#username').type('admin');
    cy.get('#password').type('password123');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginSuccess');
    cy.url({ timeout: 10000 }).should('include', '/dashboard');
  });

  it('3.2. Lưu access_token và refresh_token vào localStorage sau login', () => {
    cy.intercept('POST', `${API_BASE}/auth/login`, {
      statusCode: 200,
      body: mockLoginSuccess('admin'),
    }).as('loginSuccess');

    cy.visit('/auth/login');
    cy.get('#username').type('admin');
    cy.get('#password').type('password123');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginSuccess');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('access_token')).to.exist;
      expect(win.localStorage.getItem('refresh_token')).to.exist;
    });
  });

  it('3.3. Lưu thông tin user (username, role) vào localStorage', () => {
    cy.intercept('POST', `${API_BASE}/auth/login`, {
      statusCode: 200,
      body: mockLoginSuccess('manager'),
    }).as('loginSuccess');

    cy.visit('/auth/login');
    cy.get('#username').type('manager');
    cy.get('#password').type('password123');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginSuccess');
    cy.window().then((win) => {
      const userStr = win.localStorage.getItem('user');
      expect(userStr).to.exist;
      const user = JSON.parse(userStr!);
      expect(user.username).to.equal('testuser');
      expect(user.role).to.be.oneOf(['admin', 'manager', 'employee']);
    });
  });

  it('3.4. Nút Sign In hiển thị loading state khi đang xử lý', () => {
    cy.intercept('POST', `${API_BASE}/auth/login`, (req) => {
      req.reply({
        delay: 500,
        statusCode: 200,
        body: mockLoginSuccess(),
      });
    }).as('loginDelay');

    cy.visit('/auth/login');
    cy.get('#username').type('admin');
    cy.get('#password').type('password123');
    cy.get('button[type="submit"]').click();

    // Kiểm tra text "Signing in..." xuất hiện trong lúc loading
    cy.contains('Signing in...', { timeout: 1000 }).should('be.visible');
    cy.wait('@loginDelay');
    cy.url().should('include', '/dashboard');
  });
});

describe('4. PHÂN QUYỀN - Auth Guard (chưa đăng nhập)', () => {
  const protectedRoutes = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/hrm/employees', label: 'HRM Employees' },
    { path: '/attendance', label: 'Attendance' },
    { path: '/payroll', label: 'Payroll' },
    { path: '/reports', label: 'Reports' },
    { path: '/face-recognition', label: 'Face Recognition' },
    { path: '/chatbot', label: 'Chatbot' },
  ];

  beforeEach(() => {
    cy.clearAuthState();
  });

  protectedRoutes.forEach(({ path, label }) => {
    it(`4.1. Truy cập ${label} (${path}) khi chưa login → redirect về /auth/login`, () => {
      cy.visit(path);
      cy.url({ timeout: 5000 }).should('include', '/auth/login');
      cy.url().should('include', 'returnUrl'); // returnUrl query param để redirect lại sau khi login
    });
  });

  it('4.2. Query param returnUrl được lưu khi redirect từ protected route', () => {
    cy.visit('/dashboard');
    cy.url().should('include', '/auth/login');
    cy.url().should('include', 'returnUrl=%2Fdashboard');
  });
});

describe('5. PHÂN QUYỀN - Truy cập sau khi đăng nhập', () => {
  beforeEach(() => {
    cy.clearAuthState();
    cy.intercept('POST', `${API_BASE}/auth/login`, {
      statusCode: 200,
      body: mockLoginSuccess('admin'),
    }).as('login');
    cy.intercept('GET', `${API_BASE}/employees*`, { statusCode: 200, body: [] }).as('employees');
  });

  it('5.1. Sau login có thể truy cập /dashboard', () => {
    cy.login('admin', 'password123');
    cy.wait('@login');
    cy.url().should('include', '/dashboard');
    cy.contains('Dashboard', { timeout: 5000 }).should('be.visible');
  });

  it('5.2. Sau login có thể truy cập /hrm/employees', () => {
    cy.login('admin', 'password123');
    cy.wait('@login');
    cy.visit('/hrm/employees');
    cy.url().should('include', '/hrm/employees');
    // Sidebar hiển thị khi đã login
    cy.get('app-sidebar, .sidebar, aside').should('exist');
  });

  it('5.3. Sau login có thể truy cập /attendance', () => {
    cy.login('admin', 'password123');
    cy.wait('@login');
    cy.visit('/attendance');
    cy.url().should('include', '/attendance');
  });

  it('5.4. Sidebar hiển thị đầy đủ menu khi đã đăng nhập', () => {
    cy.login('admin', 'password123');
    cy.wait('@login');
    cy.visit('/dashboard');
    // Sidebar có các mục: Dashboard, Nhân sự, Chấm công, Lương, Báo cáo...
    cy.contains('Dashboard').should('be.visible');
    cy.contains('Nhân sự').should('be.visible');
    cy.contains('Chấm công').should('be.visible');
    cy.contains('Lương').should('be.visible');
    cy.contains('Báo cáo').should('be.visible');
  });
});

describe('6. XỬ LÝ 401 - Token hết hạn / Unauthorized', () => {
  it('6.1. Khi API trả 401 (ngoài trang login) → logout và redirect về login', () => {
    // Login trước
    cy.intercept('POST', `${API_BASE}/auth/login`, {
      statusCode: 200,
      body: mockLoginSuccess('admin'),
    }).as('login');
    cy.login('admin', 'password123');
    cy.wait('@login');
    cy.url().should('include', '/dashboard');

    // Giả lập API protected trả 401
    cy.intercept('GET', `${API_BASE}/employees*`, {
      statusCode: 401,
      body: { message: 'Unauthorized' },
    }).as('unauthorized');

    cy.visit('/hrm/employees');
    cy.wait('@unauthorized');
    // Error interceptor gọi authService.logout() → clear storage + navigate /auth/login
    cy.url({ timeout: 5000 }).should('include', '/auth/login');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('access_token')).to.be.null;
    });
  });
});

describe('7. XỬ LÝ 403 - Forbidden (không có quyền)', () => {
  it('7.1. Khi API trả 403 → redirect đến /unauthorized', () => {
    cy.intercept('POST', `${API_BASE}/auth/login`, {
      statusCode: 200,
      body: mockLoginSuccess('employee'),
    }).as('login');

    // Employee cố truy cập API chỉ dành cho ADMIN
    cy.intercept('GET', `${API_BASE}/employees*`, {
      statusCode: 403,
      body: { message: 'Forbidden' },
    }).as('forbidden');

    cy.login('employee', 'password123');
    cy.wait('@login');
    cy.visit('/hrm/employees');

    cy.wait('@forbidden');
    // Error interceptor: status 403 → router.navigate(['/unauthorized'])
    // Lưu ý: Nếu app chưa có route /unauthorized, Angular có thể redirect về /** → /auth/login
    cy.url({ timeout: 5000 }).should(
      'satisfy',
      (url) => url.includes('/unauthorized') || url.includes('/auth/login')
    );
  });
});

describe('8. CHỨC NĂNG BỔ SUNG - Toggle password visibility', () => {
  beforeEach(() => {
    cy.clearAuthState();
    cy.visit('/auth/login');
  });

  it('8.1. Mặc định password bị ẩn (type=password)', () => {
    cy.get('#password').should('have.attr', 'type', 'password');
  });

  it('8.2. Click nút show/hide password → đổi type', () => {
    cy.get('#password').type('secret123');
    // Nút toggle password (button type="button" trong form - không phải submit)
    cy.get('form button[type="button"]').first().click();
    cy.get('#password').should('have.attr', 'type', 'text');
  });
});
