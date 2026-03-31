import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AssignShiftRangeRequest, AttendanceService, ShiftTemplateResponse, ShiftTemplateUpsertPayload } from './attendance.service';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let httpMock: HttpTestingController;

  const createShiftResponse = (overrides: Partial<ShiftTemplateResponse> = {}): ShiftTemplateResponse => ({
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

  const createShiftPayload = (overrides: Partial<ShiftTemplateUpsertPayload> = {}): ShiftTemplateUpsertPayload => ({
    shiftCode: 'S1',
    shiftName: 'Ca sang',
    startTime: '08:00',
    endTime: '17:00',
    breakMinutes: 60,
    graceInMinutes: 5,
    graceOutMinutes: 5,
    isNightShift: false,
    minWorkMinutes: 480,
    isActive: true,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AttendanceService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AttendanceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('passes active and q params to getShiftTemplates', () => {
    service.getShiftTemplates(true, 'sang').subscribe((items) => {
      expect(items.length).toBe(1);
    });

    const req = httpMock.expectOne((request) => request.url === '/api/v1/shifts');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('active')).toBe('true');
    expect(req.request.params.get('q')).toBe('sang');
    req.flush([createShiftResponse()]);
  });

  it('calls create, update, and delete shift template endpoints', () => {
    const createPayload = createShiftPayload({ shiftName: 'Ca toi', shiftCode: 'S2', startTime: '22:00', endTime: '06:00', isNightShift: true });
    service.createShiftTemplate(createPayload).subscribe();
    const createReq = httpMock.expectOne('/api/v1/shifts');
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual(createPayload);
    createReq.flush(createShiftResponse({ shiftId: 5, shiftName: 'Ca toi', shiftCode: 'S2', isNightShift: true }));

    const updatePayload = createShiftPayload({ shiftName: 'Ca toi moi', shiftCode: 'S2' });
    service.updateShiftTemplate(5, updatePayload).subscribe();
    const updateReq = httpMock.expectOne('/api/v1/shifts/5');
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body).toEqual(updatePayload);
    updateReq.flush(createShiftResponse({ shiftId: 5, shiftName: 'Ca toi moi', shiftCode: 'S2' }));

    service.deleteShiftTemplate(5).subscribe();
    const deleteReq = httpMock.expectOne('/api/v1/shifts/5');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);
  });

  it('calls setShiftTemplateActive with active query param', () => {
    service.setShiftTemplateActive(9, false).subscribe((response) => {
      expect(response.isActive).toBe(false);
    });

    const req = httpMock.expectOne('/api/v1/shifts/9/active?active=false');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBeNull();
    req.flush(createShiftResponse({ shiftId: 9, isActive: false }));
  });

  it('searches attendance email employees by name', () => {
    service.searchAttendanceEmailEmployees('an', 1, 10, 'employee_id', 'desc').subscribe((response) => {
      expect(response.items[0].employeeId).toBe(8);
    });

    const req = httpMock.expectOne((request) => request.url === '/api/employees/search');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('name')).toBe('an');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('sortBy')).toBe('employee_id');
    expect(req.request.params.get('sortDir')).toBe('desc');
    req.flush({
      items: [
        { employeeId: 8, employeeCode: 'EMP008', fullName: 'Tran An', email: 'an@example.com', status: 'ACTIVE' },
      ],
      page: 1,
      size: 10,
      totalItems: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
  });

  it('posts assignShiftRange with normalized payload', () => {
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

  it('rejects invalid employee ids before requesting schedule by day', () => {
    let message = '';

    service.getScheduleByEmployeeDay(0, '2026-03-04').subscribe({
      error: (error: Error) => {
        message = String(error.message);
      },
    });

    expect(message).toContain('positive integer');
    httpMock.expectNone('/api/v1/schedules/by-employee/day');
  });

  it('returns an empty shift list when employee ids are empty', () => {
    service.getInitialShifts([]).subscribe((items) => {
      expect(items).toEqual([]);
    });

    httpMock.expectNone('/api/v1/schedules/by-employee/day');
  });

  it('maps weekly schedule responses into shifts', () => {
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
        return;
      }

      req.flush([]);
    });
  });
});
