import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EmployeeDto, EmployeeService } from './employee.service';

describe('Dich vu nhan vien', () => {
  let service: EmployeeService;
  let httpMock: HttpTestingController;

  const taoEmployee = (overrides: Partial<EmployeeDto> = {}): EmployeeDto => ({
    employeeId: 11,
    employeeCode: 'EMP011',
    fullName: 'Tran Van B',
    dob: '1999-01-01',
    gender: 'MALE',
    phone: '0912345678',
    email: 'b@test.com',
    status: 'ACTIVE',
    departmentId: 3,
    positionId: 4,
    managerId: 1,
    hireDate: '2025-01-01',
    terminatedDate: '',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EmployeeService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmployeeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('✅ getAll map dúng khi API tr? v? m?ng thu?n', () => {
    service.getAll().subscribe((employees) => {
      expect(employees.length).toBe(1);
      expect(employees[0].employeeId).toBe(11);
    });

    const req = httpMock.expectOne('/api/employees');
    expect(req.request.method).toBe('GET');
    req.flush([taoEmployee()]);
  });

  it('✅ getAll map dúng khi API tr? v? d?ng { items }', () => {
    service.getAll().subscribe((employees) => {
      expect(employees[0].employeeCode).toBe('EMP099');
    });

    const req = httpMock.expectOne('/api/employees');
    req.flush({ items: [taoEmployee({ employeeId: 99, employeeCode: 'EMP099' })] });
  });

  it('✅ getAll tr? m?ng r?ng khi shape ph?n h?i không h?p l?', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.getAll().subscribe((employees) => {
      expect(employees).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
    });

    const req = httpMock.expectOne('/api/employees');
    req.flush({ unknown: [] });
  });

  it('✅ getDepartments h? tr? shape PageResponse có items', () => {
    service.getDepartments().subscribe((departments) => {
      expect(departments.length).toBe(1);
      expect(departments[0].departmentName).toBe('HR');
    });

    const req = httpMock.expectOne('/api/departments');
    req.flush({
      items: [{ departmentId: 1, departmentName: 'HR' }],
      page: 1,
      size: 10,
      totalItems: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
  });

  it('✅ create/update/delete g?i dúng method và endpoint', () => {
    service.create({ fullName: 'New' }).subscribe();
    const createReq = httpMock.expectOne('/api/employees');
    expect(createReq.request.method).toBe('POST');
    createReq.flush(taoEmployee({ fullName: 'New' }));

    service.update(3, { fullName: 'Edit' }).subscribe();
    const updateReq = httpMock.expectOne('/api/employees/3');
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body.fullName).toBe('Edit');
    updateReq.flush(taoEmployee({ employeeId: 3, fullName: 'Edit' }));

    service.delete(3).subscribe();
    const deleteReq = httpMock.expectOne('/api/employees/3');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);
  });

  it('✅ getPage truy?n dúng params 0-based và m?c d?nh sort', () => {
    service.getPage(2, 20).subscribe();

    const req = httpMock.expectOne((request) => request.url === '/api/employees/page');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('sortBy')).toBe('employeeId');
    expect(req.request.params.get('sortDir')).toBe('asc');
    req.flush({ items: [], page: 1, size: 20, totalItems: 0, totalPages: 0, hasNext: false, hasPrev: false });
  });

  it('✅ searchByName truy?n dúng query và h? tr? sort custom', () => {
    service.searchByName('an', 3, 5, 'fullName', 'desc').subscribe();

    const req = httpMock.expectOne((request) => request.url === '/api/employees/search');
    expect(req.request.params.get('name')).toBe('an');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('5');
    expect(req.request.params.get('sortBy')).toBe('fullName');
    expect(req.request.params.get('sortDir')).toBe('desc');
    req.flush({ items: [], page: 2, size: 5, totalItems: 0, totalPages: 0, hasNext: false, hasPrev: true });
  });

  it('✅ chuy?n ti?p l?i 500 khi g?i getById th?t b?i', () => {
    let status = 0;

    service.getById(1).subscribe({
      error: (error) => {
        status = error.status;
      },
    });

    const req = httpMock.expectOne('/api/employees/1');
    req.flush({ message: 'error' }, { status: 500, statusText: 'Server Error' });

    expect(status).toBe(500);
  });
});



