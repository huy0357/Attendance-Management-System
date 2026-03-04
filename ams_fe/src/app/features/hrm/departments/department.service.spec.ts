import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DepartmentService } from './department.service';
import { DepartmentRequest } from '../../../shared/models/department.model';

describe('Dich vu phong ban', () => {
  let service: DepartmentService;
  let httpMock: HttpTestingController;

  const taoRequest = (overrides: Partial<DepartmentRequest> = {}): DepartmentRequest => ({
    departmentName: 'IT',
    departmentCode: 'IT01',
    parentDepartmentId: null,
    isActive: true,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DepartmentService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(DepartmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('✅ getAll g?i dúng param phân trang/sort và map Spring Page v? PageResponse', () => {
    service.getAll(2, 20, 'it', 'departmentName', 'asc').subscribe((response) => {
      expect(response.items.length).toBe(1);
      expect(response.totalItems).toBe(5);
      expect(response.page).toBe(2);
      expect(response.hasNext).toBe(true);
      expect(response.hasPrev).toBe(true);
    });

    const req = httpMock.expectOne((request) => request.url === '/api/departments');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('sort')).toBe('departmentName,ASC');
    expect(req.request.params.get('keyword')).toBe('it');

    req.flush({
      content: [{ departmentId: 1, departmentName: 'IT' }],
      totalElements: 5,
      totalPages: 3,
      number: 1,
      size: 20,
      first: false,
      last: false,
    });
  });

  it('✅ getAll không g?i keyword khi chu?i r?ng', () => {
    service.getAll(1, 10, '').subscribe();

    const req = httpMock.expectOne('/api/departments?page=0&size=10&sort=departmentId,DESC');
    expect(req.request.params.has('keyword')).toBe(false);
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10, first: true, last: true });
  });

  it('✅ getById/create/update/delete/getTree g?i dúng endpoint HTTP', () => {
    service.getById(2).subscribe();
    const getReq = httpMock.expectOne('/api/departments/2');
    expect(getReq.request.method).toBe('GET');
    getReq.flush({ departmentId: 2, departmentName: 'HR', children: [] });

    service.create(taoRequest()).subscribe();
    const createReq = httpMock.expectOne('/api/departments');
    expect(createReq.request.method).toBe('POST');
    createReq.flush({ departmentId: 7, departmentName: 'IT', children: [] });

    service.update(7, taoRequest({ departmentName: 'IT Updated' })).subscribe();
    const updateReq = httpMock.expectOne('/api/departments/7');
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body.departmentName).toBe('IT Updated');
    updateReq.flush({ departmentId: 7, departmentName: 'IT Updated', children: [] });

    service.delete(7).subscribe();
    const deleteReq = httpMock.expectOne('/api/departments/7');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    service.getTree().subscribe((tree) => {
      expect(tree.length).toBe(1);
    });
    const treeReq = httpMock.expectOne('/api/departments/tree');
    expect(treeReq.request.method).toBe('GET');
    treeReq.flush([{ departmentId: 1, departmentName: 'Root', children: [] }]);
  });

  it('✅ chuy?n ti?p l?i 400 cho caller khi payload sai', () => {
    let status = 0;

    service.create(taoRequest({ departmentName: '' })).subscribe({
      error: (error) => {
        status = error.status;
      },
    });

    const req = httpMock.expectOne('/api/departments');
    req.flush({ message: 'bad request' }, { status: 400, statusText: 'Bad Request' });

    expect(status).toBe(400);
  });
});



