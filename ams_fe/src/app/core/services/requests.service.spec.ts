import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RequestsService } from './requests.service';
import { RequestsResponse, RequestsUpsertRequest } from '../../shared/models/requests.model';

describe('Dich vu quan ly don tu', () => {
  let service: RequestsService;
  let httpMock: HttpTestingController;

  const taoPayload = (): RequestsUpsertRequest => ({
    employeeId: 7,
    requestType: 'OVERTIME',
    title: 'Lam them',
    reason: 'Chot sprint',
    startDatetime: '2026-03-01T18:00:00Z',
    endDatetime: '2026-03-01T20:00:00Z',
  });

  const taoRequest = (overrides: Partial<RequestsResponse> = {}): RequestsResponse => ({
    requestId: 1,
    employeeId: 7,
    employeeName: 'Nguyen Van A',
    requestType: 'OVERTIME',
    title: 'Lam them',
    reason: 'Chot sprint',
    startDatetime: '2026-03-01T18:00:00Z',
    endDatetime: '2026-03-01T20:00:00Z',
    status: 'SUBMITTED',
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RequestsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RequestsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('✅ g?i POST /api/requests khi t?o yêu c?u và lo?i b? field undefined', () => {
    const payload = { ...taoPayload(), reason: undefined as unknown as string };

    service.createRequest(payload).subscribe((response) => {
      expect(response.requestId).toBe(10);
    });

    const req = httpMock.expectOne('/api/requests');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.reason).toBeUndefined();
    expect(req.request.body.title).toBe('Lam them');

    req.flush(taoRequest({ requestId: 10 }));
  });

  it('✅ g?i PUT submit dúng endpoint /submit', () => {
    service.submitRequest(99).subscribe((response) => {
      expect(response.requestId).toBe(99);
    });

    const req = httpMock.expectOne('/api/requests/99/submit');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBeNull();
    req.flush(taoRequest({ requestId: 99 }));
  });

  it('✅ g?i GET /api/requests v?i employeeId khi l?y danh sách c?a nhân viên', () => {
    service.getMyRequests(42).subscribe((items) => {
      expect(items.length).toBe(1);
      expect(items[0].employeeId).toBe(42);
    });

    const req = httpMock.expectOne((request) => request.url === '/api/requests');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('employeeId')).toBe('42');
    req.flush([taoRequest({ employeeId: 42 })]);
  });

  it('✅ ch? tr? v? don OVERTIME khi g?i getOvertimeRequests', () => {
    service.getOvertimeRequests(7).subscribe((items) => {
      expect(items.length).toBe(1);
      expect(items[0].requestType).toBe('OVERTIME');
    });

    const req = httpMock.expectOne('/api/requests?employeeId=7');
    expect(req.request.method).toBe('GET');
    req.flush([
      taoRequest({ requestType: 'LEAVE' }),
      taoRequest({ requestId: 2, requestType: 'OVERTIME' }),
    ]);
  });

  it('✅ g?i PUT /api/requests/{id} khi c?p nh?t yêu c?u', () => {
    const payload = taoPayload();

    service.updateRequest(5, payload).subscribe((response) => {
      expect(response.requestId).toBe(5);
    });

    const req = httpMock.expectOne('/api/requests/5');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.employeeId).toBe(7);
    req.flush(taoRequest({ requestId: 5 }));
  });

  it('✅ g?i DELETE /api/requests/{id} khi xóa yêu c?u', () => {
    service.deleteRequest(3).subscribe((response) => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne('/api/requests/3');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('✅ g?i PUT /approval v?i payload phê duy?t', () => {
    service.approveOrReject(6, { approverId: 2, status: 'APPROVED', decisionNote: 'OK' }).subscribe((response) => {
      expect(response.status).toBe('APPROVED');
    });

    const req = httpMock.expectOne('/api/requests/6/approval');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ approverId: 2, status: 'APPROVED', decisionNote: 'OK' });
    req.flush(taoRequest({ requestId: 6, status: 'APPROVED' }));
  });

  it('✅ d?y l?i HTTP 500 v? caller khi t?o yêu c?u th?t b?i', () => {
    let status = 0;

    service.createRequest(taoPayload()).subscribe({
      error: (err) => {
        status = err.status;
      },
    });

    const req = httpMock.expectOne('/api/requests');
    req.flush({ message: 'server error' }, { status: 500, statusText: 'Server Error' });

    expect(status).toBe(500);
  });
});



