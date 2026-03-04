import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AttendanceService, AssignShiftRangeRequest, ShiftTemplateResponse } from './attendance.service';
import { RequestsUpsertRequest } from '../../shared/models/requests.model';

describe('Dich vu cham cong', () => {
  let service: AttendanceService;
  let httpMock: HttpTestingController;

  const taoShift = (overrides: Partial<ShiftTemplateResponse> = {}): ShiftTemplateResponse => ({
    shiftId: 1,
    shiftCode: 'S1',
    shiftName: 'Ca sang',
    startTime: '08:00:00',
    endTime: '17:00:00',
    breakMinutes: 60,
    graceInMinutes: 5,
    graceOutMinutes: 5,
    isNightShift: false,
    minWorkMinutes: 480,
    isActive: true,
    ...overrides,
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AttendanceService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AttendanceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('✅ getShiftTemplates g?i dúng params active và q', () => {
    service.getShiftTemplates(true, 'sang').subscribe((items) => {
      expect(items.length).toBe(1);
    });

    const req = httpMock.expectOne((request) => request.url === '/api/v1/shifts');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('active')).toBe('true');
    expect(req.request.params.get('q')).toBe('sang');
    req.flush([taoShift()]);
  });

  it('✅ create/update/delete shift template g?i dúng endpoint', () => {
    service.createShiftTemplate({ shiftName: 'Ca toi' }).subscribe();
    const createReq = httpMock.expectOne('/api/v1/shifts');
    expect(createReq.request.method).toBe('POST');
    createReq.flush(taoShift({ shiftId: 5 }));

    service.updateShiftTemplate(5, { shiftName: 'Ca toi moi' }).subscribe();
    const updateReq = httpMock.expectOne('/api/v1/shifts/5');
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body.shiftName).toBe('Ca toi moi');
    updateReq.flush(taoShift({ shiftId: 5, shiftName: 'Ca toi moi' }));

    service.deleteShiftTemplate(5).subscribe();
    const deleteReq = httpMock.expectOne('/api/v1/shifts/5');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);
  });

  it('✅ setShiftTemplateActive g?i PATCH v?i query active', () => {
    service.setShiftTemplateActive(9, false).subscribe((response) => {
      expect(response.isActive).toBe(false);
    });

    const req = httpMock.expectOne('/api/v1/shifts/9/active?active=false');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBeNull();
    req.flush(taoShift({ shiftId: 9, isActive: false }));
  });

  it('✅ findEmployeeByNameOrEmail tìm du?c theo email ho?c tên', () => {
    service.findEmployeeByNameOrEmail('an@example.com').subscribe((employee) => {
      expect(employee?.employeeId).toBe(8);
    });

    const req = httpMock.expectOne('/api/employees');
    expect(req.request.method).toBe('GET');
    req.flush([
      { employeeId: 8, employeeCode: 'EMP008', fullName: 'Tran An', email: 'an@example.com' },
      { employeeId: 9, employeeCode: 'EMP009', fullName: 'Le B', email: 'b@example.com' },
    ]);
  });

  it('✅ approveRequest resolve employee t? username r?i g?i PUT /approval', () => {
    localStorage.setItem('ams.username', 'ql@example.com');

    service.approveRequest(15, 'APPROVED', 'duyet').subscribe((response) => {
      expect(response.requestId).toBe(15);
      expect(response.status).toBe('APPROVED');
    });

    const lookupReq = httpMock.expectOne('/api/employees');
    lookupReq.flush([
      { employeeId: 21, employeeCode: 'EMP021', fullName: 'Quan Ly', email: 'ql@example.com' },
    ]);

    const approveReq = httpMock.expectOne('/api/requests/15/approval');
    expect(approveReq.request.method).toBe('PUT');
    expect(approveReq.request.body).toEqual({ approverId: 21, status: 'APPROVED', decisionNote: 'duyet' });
    approveReq.flush({
      requestId: 15,
      employeeId: 10,
      employeeName: 'A',
      requestType: 'OVERTIME',
      title: 'OT',
      reason: 'x',
      startDatetime: '2026-03-01T10:00:00Z',
      endDatetime: '2026-03-01T12:00:00Z',
      status: 'APPROVED',
    });
  });

  it('✅ approveRequest báo l?i khi thi?u username trong auth context', () => {
    let thongDiep = '';

    service.approveRequest(2, 'APPROVED').subscribe({
      error: (error) => {
        thongDiep = String(error.message);
      },
    });

    expect(thongDiep).toContain('Missing username');
    httpMock.expectNone('/api/employees');
  });

  it('✅ createRequest/getRequestsByEmployee/update/delete g?i dúng endpoint requests', () => {
    const payload: RequestsUpsertRequest = {
      employeeId: 1,
      requestType: 'LEAVE',
      title: 'Nghi phep',
      reason: 'Viec rieng',
      startDatetime: '2026-03-10T08:00:00Z',
      endDatetime: '2026-03-11T17:00:00Z',
    };

    service.createRequest(payload).subscribe();
    const createReq = httpMock.expectOne('/api/requests');
    expect(createReq.request.method).toBe('POST');
    createReq.flush({ requestId: 1 });

    service.getRequestsByEmployee(1).subscribe();
    const listReq = httpMock.expectOne('/api/requests?employeeId=1');
    expect(listReq.request.method).toBe('GET');
    listReq.flush([]);

    service.updateRequest(1, payload).subscribe();
    const updateReq = httpMock.expectOne('/api/requests/1');
    expect(updateReq.request.method).toBe('PUT');
    updateReq.flush({ requestId: 1 });

    service.deleteRequest(1).subscribe();
    const deleteReq = httpMock.expectOne('/api/requests/1');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);
  });

  it('✅ assignShiftRange g?i POST dúng payload', () => {
    const payload: AssignShiftRangeRequest = {
      employeeId: 7,
      shiftId: 2,
      startDate: '2026-03-01',
      endDate: '2026-03-07',
      scheduleSource: 'MANUAL',
      overwrite: true,
    };

    service.assignShiftRange(payload).subscribe((response) => {
      expect(response.created).toBe(7);
    });

    const req = httpMock.expectOne('/api/v1/schedules/assign-range');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ ...payload, created: 7, updated: 0 });
  });

  it('✅ getScheduleByEmployeeDay ch?n id không h?p l? tru?c khi g?i API', () => {
    let thongDiep = '';

    service.getScheduleByEmployeeDay(0, '2026-03-04').subscribe({
      error: (error) => {
        thongDiep = String(error.message);
      },
    });

    expect(thongDiep).toContain('positive integer');
    httpMock.expectNone('/api/v1/schedules/by-employee/day');
  });

  it('✅ getInitialShifts tr? [] khi danh sách nhân viên r?ng', () => {
    service.getInitialShifts([]).subscribe((items) => {
      expect(items).toEqual([]);
    });

    httpMock.expectNone('/api/v1/schedules/by-employee/day');
  });

  it('✅ getInitialShifts map d? li?u schedule thành shift trong tu?n', () => {
    const weekStart = new Date('2026-03-02T00:00:00');

    service.getInitialShifts([3], weekStart).subscribe((items) => {
      expect(items.length).toBe(1);
      expect(items[0].employeeId).toBe('3');
      expect(items[0].day).toBe(0);
      expect(items[0].type).toBe('morning');
    });

    const requests = httpMock.match((request) => request.url === '/api/v1/schedules/by-employee/day');
    expect(requests.length).toBe(7);

    requests.forEach((req, index) => {
      if (index === 0) {
        req.flush([
          {
            scheduleId: 100,
            employeeId: 3,
            workDate: '2026-03-02',
            shiftId: 1,
            shiftCode: 'S1',
            shiftName: 'Sang',
            startTime: '08:00:00',
            endTime: '17:00:00',
            breakMinutes: 60,
            isNightShift: false,
            scheduleSource: 'MANUAL',
          },
        ]);
      } else {
        req.flush([]);
      }
    });
  });
});



