import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EmployeeService } from './employee.service';
import { StorageService } from '../../../core/services/storage.service';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api.endpoints';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EmployeeService, ApiService, StorageService],
    });

    service = TestBed.inject(EmployeeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call paging endpoint with query params', () => {
    service.getPage({ page: 1, size: 10, sortBy: 'employee_id', sortDir: 'desc' }).subscribe();

    const req = httpMock.expectOne(
      `http://localhost:8080/api${API_ENDPOINTS.EMPLOYEES_PAGE}?page=1&size=10&sortBy=employee_id&sortDir=desc`
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      items: [],
      page: 1,
      size: 10,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });
  });

  it('should call search endpoint with name', () => {
    service.searchByName('test', { page: 2, size: 5 }).subscribe();

    const req = httpMock.expectOne(
      `http://localhost:8080/api${API_ENDPOINTS.EMPLOYEES_SEARCH}?name=test&page=2&size=5`
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      items: [],
      page: 2,
      size: 5,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });
  });
});
