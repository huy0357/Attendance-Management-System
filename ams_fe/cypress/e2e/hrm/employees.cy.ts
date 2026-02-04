/**
 * Cypress E2E Tests: Employees CRUD
 *
 * Kiểm thử toàn bộ trang FE Employees bao gồm:
 * - READ: Danh sách nhân viên, tìm kiếm, phân trang, sắp xếp
 * - READ: Chi tiết nhân viên
 * - CREATE: Thêm nhân viên mới
 * - UPDATE: Chỉnh sửa nhân viên
 * - DELETE: Xóa nhân viên
 */

const API_BASE = 'http://localhost:8080/api';

// Mock data
const mockEmployee = (overrides: Partial<Record<string, unknown>> = {}) => ({
  employeeId: 1,
  employeeCode: 'NV001',
  fullName: 'Nguyen Van A',
  dob: '1990-01-15',
  gender: 'nam',
  phone: '0901234567',
  email: 'nva@example.com',
  status: 'ACTIVE',
  departmentId: 1,
  positionId: 1,
  managerId: null,
  hireDate: '2020-05-01',
  terminatedDate: null,
  createdAt: '2024-01-01T00:00:00',
  updatedAt: '2024-01-01T00:00:00',
  ...overrides,
});

const mockPageResponse = (items: unknown[], totalItems = items.length) => ({
  items,
  page: 1,
  size: 10,
  totalItems,
  totalPages: Math.ceil(totalItems / 10),
  hasNext: totalItems > 10,
  hasPrev: false,
});

const mockLoginSuccess = () => ({
  accessToken: 'mock-token',
  refreshToken: 'mock-refresh',
  tokenType: 'Bearer',
  expiresInSeconds: 3600,
  username: 'admin',
  role: 'admin',
});

// Helper: login và stub API cần thiết
function setupAuthAndEmployees(employees: unknown[] = [mockEmployee()]) {
  cy.intercept('POST', `${API_BASE}/auth/login`, {
    statusCode: 200,
    body: mockLoginSuccess(),
  }).as('login');
  cy.intercept('GET', `${API_BASE}/employees/page*`, {
    statusCode: 200,
    body: mockPageResponse(employees),
  }).as('getEmployeesPage');
  cy.intercept('GET', `${API_BASE}/employees/search*`, {
    statusCode: 200,
    body: mockPageResponse(employees),
  }).as('searchEmployees');
  cy.login('admin', 'password123');
  cy.wait('@login');
}

describe('EMPLOYEES - Trang danh sách (READ)', () => {
  beforeEach(() => {
    cy.clearAuthState();
  });

  it('1.1. Chuyển đến /hrm/employees sau khi login', () => {
    setupAuthAndEmployees();
    cy.visit('/hrm/employees');
    cy.url().should('include', '/hrm/employees');
    cy.contains('Employee List').should('be.visible');
  });

  it('1.2. Hiển thị header và nút Add New Employee', () => {
    setupAuthAndEmployees();
    cy.visit('/hrm/employees');
    cy.contains('Employee List').should('be.visible');
    cy.contains('Manage employee records in one place').should('be.visible');
    cy.contains('Add New Employee').should('be.visible');
  });

  it('1.3. Hiển thị ô tìm kiếm và nút Search, Refresh', () => {
    setupAuthAndEmployees();
    cy.visit('/hrm/employees');
    cy.get('input[placeholder="Search by name"]').should('be.visible');
    cy.contains('button', 'Search').should('be.visible');
    cy.contains('button', 'Refresh').should('be.visible');
  });

  it('1.4. Hiển thị bảng với các cột: Employee Code, Full Name, Email, Phone, Status', () => {
    setupAuthAndEmployees();
    cy.visit('/hrm/employees');
    cy.wait('@getEmployeesPage');
    cy.contains('Employee Code').should('be.visible');
    cy.contains('Full Name').should('be.visible');
    cy.contains('Email').should('be.visible');
    cy.contains('Phone Number').should('be.visible');
    cy.contains('Status').should('be.visible');
  });

  it('1.5. Hiển thị dữ liệu nhân viên trong bảng', () => {
    const emp = mockEmployee({ fullName: 'Test User', email: 'test@test.com' });
    setupAuthAndEmployees([emp]);
    cy.visit('/hrm/employees');
    cy.wait('@getEmployeesPage');
    cy.contains('Test User').should('be.visible');
    cy.contains('test@test.com').should('be.visible');
    cy.contains('NV001').should('be.visible');
    cy.contains('ACTIVE').should('be.visible');
  });

  it('1.6. Hiển thị empty state khi không có nhân viên', () => {
    setupAuthAndEmployees([]);
    cy.visit('/hrm/employees');
    cy.wait('@getEmployeesPage');
    cy.contains('No employees found').should('be.visible');
    cy.contains('Add your first employee or adjust your search criteria').should('be.visible');
  });

  it('1.7. Click Search gọi API search với keyword', () => {
    setupAuthAndEmployees();
    cy.visit('/hrm/employees');
    cy.wait('@getEmployeesPage');
    cy.get('input[placeholder="Search by name"]').type('John');
    cy.contains('button', 'Search').click();
    cy.wait('@searchEmployees').its('request.url').should('include', 'name=John');
  });

  it('1.8. Click Refresh reset search và load lại', () => {
    setupAuthAndEmployees();
    cy.visit('/hrm/employees');
    cy.get('input[placeholder="Search by name"]').type('abc');
    cy.contains('button', 'Refresh').click();
    cy.get('input[placeholder="Search by name"]').should('have.value', '');
    cy.wait('@getEmployeesPage');
  });

  it('1.9. Click vào row chuyển đến trang chi tiết', () => {
    const emp = mockEmployee({ employeeId: 5, fullName: 'Click Me' });
    setupAuthAndEmployees([emp]);
    cy.intercept('GET', `${API_BASE}/employees/5`, {
      statusCode: 200,
      body: emp,
    }).as('getEmployee');
    cy.visit('/hrm/employees');
    cy.wait('@getEmployeesPage');
    cy.contains('Click Me').click();
    cy.url().should('include', '/hrm/employees/5/detail');
    cy.wait('@getEmployee');
    cy.contains('Employee Detail').should('be.visible');
  });

  it('1.10. Nút Add New Employee chuyển đến form thêm mới', () => {
    setupAuthAndEmployees();
    cy.visit('/hrm/employees');
    cy.contains('Add New Employee').first().click();
    cy.url().should('include', '/hrm/employees/new');
    cy.contains('Add New Employee').should('be.visible');
  });
});

describe('EMPLOYEES - Trang thêm mới (CREATE)', () => {
  beforeEach(() => {
    cy.clearAuthState();
    setupAuthAndEmployees();
  });

  it('2.1. Hiển thị form thêm nhân viên với đầy đủ trường', () => {
    cy.visit('/hrm/employees/new');
    cy.contains('Add New Employee').should('be.visible');
    cy.get('input[formControlName="employeeCode"]').should('exist');
    cy.get('input[formControlName="fullName"]').should('exist');
    cy.get('input[formControlName="email"]').should('exist');
    cy.get('input[formControlName="phone"]').should('exist');
    cy.get('input[formControlName="dob"]').should('exist');
    cy.get('input[formControlName="gender"]').should('exist');
    cy.get('input[formControlName="departmentId"]').should('exist');
    cy.get('input[formControlName="positionId"]').should('exist');
    cy.get('input[formControlName="managerId"]').should('exist');
    cy.get('input[formControlName="hireDate"]').should('exist');
  });

  it('2.2. Có nút Back và Cancel về danh sách', () => {
    cy.visit('/hrm/employees/new');
    cy.contains('Back').should('be.visible');
    cy.contains('Cancel').should('be.visible');
  });

  it('2.3. Tạo nhân viên thành công - redirect về list và hiển thị snackbar', () => {
    cy.intercept('POST', `${API_BASE}/employees`, {
      statusCode: 200,
      body: mockEmployee({ employeeId: 99, fullName: 'New Employee' }),
    }).as('createEmployee');

    cy.visit('/hrm/employees/new');
    cy.get('input[formControlName="employeeCode"]').type('NV999');
    cy.get('input[formControlName="fullName"]').type('New Employee');
    cy.get('input[formControlName="email"]').type('new@example.com');
    cy.get('input[formControlName="phone"]').type('0912345678');
    cy.contains('button', 'Save').click();

    cy.wait('@createEmployee');
    cy.url().should('include', '/hrm/employees');
    cy.contains('Employee created successfully').should('be.visible');
  });

  it('2.4. Validation: Email không hợp lệ', () => {
    cy.visit('/hrm/employees/new');
    cy.get('input[formControlName="employeeCode"]').type('NV001');
    cy.get('input[formControlName="fullName"]').type('Test');
    cy.get('input[formControlName="email"]').type('invalid-email').blur();
    cy.get('input[formControlName="phone"]').type('0912345678');
    cy.contains('Invalid email format').should('be.visible');
    cy.contains('button', 'Save').should('be.disabled');
  });

  it('2.5. Validation: Số điện thoại không đúng format (phải bắt đầu 0, 10 số)', () => {
    cy.visit('/hrm/employees/new');
    cy.get('input[formControlName="phone"]').type('912345678').blur();
    cy.contains('Phone number must start with 0 and have 10 digits').should('be.visible');
  });

  it('2.6. API trả lỗi khi tạo - hiển thị thông báo lỗi', () => {
    cy.intercept('POST', `${API_BASE}/employees`, {
      statusCode: 400,
      body: { message: 'Employee code đã tồn tại' },
    }).as('createFail');

    cy.visit('/hrm/employees/new');
    cy.get('input[formControlName="employeeCode"]').type('NV001');
    cy.get('input[formControlName="fullName"]').type('Test');
    cy.get('input[formControlName="email"]').type('test@test.com');
    cy.get('input[formControlName="phone"]').type('0912345678');
    cy.contains('button', 'Save').click();

    cy.wait('@createFail');
    cy.url().should('include', '/hrm/employees/new');
    cy.contains('Employee code đã tồn tại').should('be.visible');
  });
});

describe('EMPLOYEES - Trang chi tiết (READ)', () => {
  const emp = mockEmployee({
    employeeId: 10,
    fullName: 'Detail User',
    email: 'detail@test.com',
    phone: '0987654321',
    employeeCode: 'NV010',
  });

  beforeEach(() => {
    cy.clearAuthState();
    setupAuthAndEmployees([emp]);
    cy.intercept('GET', `${API_BASE}/employees/10`, {
      statusCode: 200,
      body: emp,
    }).as('getEmployeeDetail');
  });

  it('3.1. Hiển thị thông tin nhân viên', () => {
    cy.visit('/hrm/employees/10/detail');
    cy.wait('@getEmployeeDetail');
    cy.contains('Employee Detail').should('be.visible');
    cy.contains('NV010').should('be.visible');
    cy.contains('Detail User').should('be.visible');
    cy.contains('detail@test.com').should('be.visible');
    cy.contains('0987654321').should('be.visible');
  });

  it('3.2. Có nút Back, Edit, Delete', () => {
    cy.visit('/hrm/employees/10/detail');
    cy.wait('@getEmployeeDetail');
    cy.contains('button', 'Back').should('be.visible');
    cy.contains('button', 'Edit').should('be.visible');
    cy.contains('button', 'Delete').should('be.visible');
  });

  it('3.3. Click Back về danh sách', () => {
    cy.visit('/hrm/employees/10/detail');
    cy.contains('button', 'Back').click();
    cy.url().should('include', '/hrm/employees');
  });

  it('3.4. Click Edit chuyển đến form chỉnh sửa', () => {
    cy.visit('/hrm/employees/10/detail');
    cy.wait('@getEmployeeDetail');
    cy.contains('button', 'Edit').click();
    cy.url().should('include', '/hrm/employees/10');
    cy.url().should('not.include', 'detail');
  });
});

describe('EMPLOYEES - Trang chỉnh sửa (UPDATE)', () => {
  const emp = mockEmployee({
    employeeId: 20,
    fullName: 'Edit Me',
    email: 'edit@test.com',
    employeeCode: 'NV020',
  });

  beforeEach(() => {
    cy.clearAuthState();
    setupAuthAndEmployees([emp]);
    cy.intercept('GET', `${API_BASE}/employees/20`, {
      statusCode: 200,
      body: emp,
    }).as('getEmployee');
  });

  it('4.1. Hiển thị form Edit với dữ liệu đã load', () => {
    cy.visit('/hrm/employees/20');
    cy.wait('@getEmployee');
    cy.contains('Edit Employee').should('be.visible');
    cy.get('input[formControlName="fullName"]').should('have.value', 'Edit Me');
    cy.get('input[formControlName="email"]').should('have.value', 'edit@test.com');
    cy.get('input[formControlName="employeeCode"]').should('have.value', 'NV020');
  });

  it('4.2. Chế độ View (read-only): form disabled, nút Edit', () => {
    cy.visit('/hrm/employees/20');
    cy.wait('@getEmployee');
    cy.get('input[formControlName="fullName"]').should('be.disabled');
    cy.contains('button', 'Edit').should('be.visible');
  });

  it('4.3. Click Edit chuyển sang chế độ sửa', () => {
    cy.visit('/hrm/employees/20');
    cy.wait('@getEmployee');
    cy.contains('button', 'Edit').click();
    cy.get('input[formControlName="fullName"]').should('not.be.disabled');
  });

  it('4.4. Cập nhật thành công - redirect về list và snackbar', () => {
    cy.intercept('PUT', `${API_BASE}/employees/20`, {
      statusCode: 200,
      body: { ...emp, fullName: 'Updated Name' },
    }).as('updateEmployee');

    cy.visit('/hrm/employees/20');
    cy.wait('@getEmployee');
    cy.contains('button', 'Edit').click();
    cy.get('input[formControlName="fullName"]').clear().type('Updated Name');
    cy.contains('button', 'Save').click();

    cy.wait('@updateEmployee');
    cy.url().should('include', '/hrm/employees');
    cy.contains('Employee updated successfully').should('be.visible');
  });
});

describe('EMPLOYEES - Xóa nhân viên (DELETE)', () => {
  const emp = mockEmployee({
    employeeId: 30,
    fullName: 'Delete Me',
    employeeCode: 'NV030',
  });

  beforeEach(() => {
    cy.clearAuthState();
    setupAuthAndEmployees([emp]);
    cy.intercept('GET', `${API_BASE}/employees/30`, {
      statusCode: 200,
      body: emp,
    }).as('getEmployee');
  });

  it('5.1. Mở dialog xác nhận khi click Delete', () => {
    cy.visit('/hrm/employees/30/detail');
    cy.wait('@getEmployee');
    cy.contains('button', 'Delete').click();
    cy.contains('Delete Employee').should('be.visible');
    cy.contains('Are you sure you want to delete employee Delete Me?').should('be.visible');
    cy.contains('button', 'Cancel').should('be.visible');
  });

  it('5.2. Click Cancel đóng dialog, không xóa', () => {
    let deleteCalled = false;
    cy.intercept('DELETE', `${API_BASE}/employees/30`, () => {
      deleteCalled = true;
    }).as('deleteEmployee');
    cy.visit('/hrm/employees/30/detail');
    cy.wait('@getEmployee');
    cy.contains('button', 'Delete').click();
    cy.get('mat-dialog-container').within(() => {
      cy.contains('button', 'Cancel').click();
    });
    cy.contains('Delete Employee').should('not.exist');
    cy.url().should('include', '/hrm/employees/30/detail');
    cy.then(() => expect(deleteCalled).to.be.false);
  });

  it('5.3. Xác nhận Delete - gọi API và redirect về list', () => {
    cy.intercept('DELETE', `${API_BASE}/employees/30`, {
      statusCode: 200,
    }).as('deleteEmployee');

    cy.visit('/hrm/employees/30/detail');
    cy.wait('@getEmployee');
    cy.contains('button', 'Delete').click();
    cy.get('mat-dialog-container').within(() => {
      cy.contains('button', 'Delete').click();
    });

    cy.wait('@deleteEmployee');
    cy.url().should('include', '/hrm/employees');
    cy.contains('Employee deleted successfully').should('be.visible');
  });
});

describe('EMPLOYEES - Điều hướng và breadcrumb', () => {
  beforeEach(() => {
    cy.clearAuthState();
    setupAuthAndEmployees();
  });

  it('6.1. Từ list -> new -> Back về list', () => {
    cy.visit('/hrm/employees');
    cy.contains('Add New Employee').first().click();
    cy.url().should('include', '/hrm/employees/new');
    cy.contains('Back').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/hrm/employees');
  });

  it('6.2. Từ list -> detail -> Edit -> form chỉnh sửa', () => {
    const emp = mockEmployee({ employeeId: 1 });
    cy.intercept('GET', `${API_BASE}/employees/1`, { statusCode: 200, body: emp }).as('getEmp');
    cy.visit('/hrm/employees');
    cy.wait('@getEmployeesPage');
    cy.contains(emp.fullName!).click();
    cy.url().should('include', '/hrm/employees/1/detail');
    cy.contains('Edit').click();
    cy.url().should('include', '/hrm/employees/1');
    cy.url().should('not.include', 'detail');
  });
});
