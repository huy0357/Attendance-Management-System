import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PageResponse, SpringPage } from '../../shared/models/page-response.model';

export interface ShiftTemplate {
  id: string;
  name: string;
  time: string;
  type: 'morning' | 'afternoon' | 'night';
  color: string;
}

export interface ScheduleEmployee {
  id: string;
  name: string;
  department: string;
  employeeCode?: string;
}

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  day: number;
  startTime: string;
  endTime: string;
  type: 'morning' | 'afternoon' | 'night';
  shiftId?: number;
  workDate?: string;
  scheduleSource?: 'MANUAL' | 'IMPORT';
  hasConflict?: boolean;
}

export interface ShiftTemplateResponse {
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  graceInMinutes: number;
  graceOutMinutes: number;
  isNightShift: boolean;
  minWorkMinutes: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShiftTemplateUpsertPayload {
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  graceInMinutes: number;
  graceOutMinutes: number;
  isNightShift: boolean;
  minWorkMinutes: number;
  isActive: boolean;
}

import { AttendanceDailyResponse } from './models/attendance-daily.model';

export interface AttendanceBatchResponse {
  message: string;
  date: string;
}

export interface AttendanceEmailSendResponse {
  message: string;
  month: string;
  employeeId?: number;
}

export interface AttendanceEmailEmployee {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  email: string;
  status: string;
}

export interface MonthlySummaryGenerateResponse {
  message: string;
  month: string;
  affectedRows: number;
}

interface EmployeeLookupDto {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  email: string;
  departmentId?: number | null;
}

interface DepartmentLookupDto {
  departmentId: number;
  departmentName: string;
}

interface DepartmentPageDto {
  content?: DepartmentLookupDto[];
}

interface EmployeeScheduleDayResponseDto {
  scheduleId: number;
  employeeId: number;
  workDate: string;
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isNightShift: boolean;
  scheduleSource: 'MANUAL' | 'IMPORT';
  note?: string;
}

export interface AssignShiftRangeRequest {
  employeeId: number;
  shiftId: number;
  startDate: string;
  endDate: string;
  scheduleSource: 'MANUAL' | 'IMPORT';
  note?: string;
  overwrite: boolean;
}

export interface AssignShiftRangeResponse {
  employeeId: number;
  shiftId: number;
  startDate: string;
  endDate: string;
  created: number;
  updated: number;
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly baseUrl = `${environment.apiBaseUrl}/attendance`;
  private readonly attendanceEmailUrl = `${environment.apiBaseUrl}/attendance-email`;
  private readonly monthlySummaryUrl = `${environment.apiBaseUrl}/monthly-summary`;
  private readonly exportsUrl = `${environment.apiBaseUrl}/exports`;
  private readonly employeesUrl = `${environment.apiBaseUrl}/employees`;
  private readonly departmentsUrl = `${environment.apiBaseUrl}/departments`;
  private readonly schedulesUrl = `${environment.apiBaseUrl}/v1/schedules`;
  private readonly shiftsUrl = `${environment.apiBaseUrl}/v1/shifts`;
  private readonly attendanceDailyUrl = `${environment.apiBaseUrl}/attendance-daily`;
  private readonly adminAttendanceUrl = `${environment.apiBaseUrl}/admin/attendance`;

  constructor(private http: HttpClient) { }

  getAttendanceDailyAdmin(from: string, to: string, page: number, size: number): Observable<SpringPage<AttendanceDailyResponse>> {
    return this.http.get<SpringPage<AttendanceDailyResponse>>(`${this.attendanceDailyUrl}/admin`, {
      params: this.buildAttendanceDailyParams(from, to, page, size),
    });
  }

  getAttendanceDailyByEmployee(
    employeeId: number,
    from: string,
    to: string,
    page: number,
    size: number,
  ): Observable<SpringPage<AttendanceDailyResponse>> {
    return this.http.get<SpringPage<AttendanceDailyResponse>>(`${this.attendanceDailyUrl}/employee/${employeeId}`, {
      params: this.buildAttendanceDailyParams(from, to, page, size),
    });
  }

  getMyAttendanceDaily(from: string, to: string, page: number, size: number): Observable<SpringPage<AttendanceDailyResponse>> {
    return this.http.get<SpringPage<AttendanceDailyResponse>>(`${this.attendanceDailyUrl}/me`, {
      params: this.buildAttendanceDailyParams(from, to, page, size),
    });
  }

  runAttendanceBatch(date: string): Observable<AttendanceBatchResponse> {
    return this.http.post<AttendanceBatchResponse>(`${this.adminAttendanceUrl}/run-batch`, null, {
      params: new HttpParams().set('date', date),
    });
  }

  searchAttendanceEmailEmployees(
    name: string,
    page: number = 1,
    size: number = 10,
    sortBy: string = 'employee_id',
    sortDir: string = 'desc',
  ): Observable<PageResponse<AttendanceEmailEmployee>> {
    const params = new HttpParams()
      .set('name', name)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<PageResponse<AttendanceEmailEmployee>>(`${this.employeesUrl}/search`, { params });
  }

  sendAttendanceEmail(month: string, employeeId: number, regenerate: boolean): Observable<AttendanceEmailSendResponse> {
    const params = new HttpParams()
      .set('month', this.normalizeMonthParam(month))
      .set('employeeId', employeeId.toString())
      .set('regenerate', String(Boolean(regenerate)));

    return this.http.post<AttendanceEmailSendResponse>(`${this.attendanceEmailUrl}/send`, null, { params });
  }

  sendAttendanceEmailToAll(month: string, regenerate: boolean): Observable<AttendanceEmailSendResponse> {
    const params = new HttpParams()
      .set('month', this.normalizeMonthParam(month))
      .set('regenerate', String(Boolean(regenerate)));

    return this.http.post<AttendanceEmailSendResponse>(`${this.attendanceEmailUrl}/send-all`, null, { params });
  }

  generateMonthlySummary(month: string): Observable<MonthlySummaryGenerateResponse> {
    const params = new HttpParams().set('month', this.normalizeMonthParam(month));
    return this.http.post<MonthlySummaryGenerateResponse>(`${this.monthlySummaryUrl}/generate`, null, { params });
  }

  exportAttendanceMonthly(month: string): Observable<HttpResponse<Blob>> {
    const params = new HttpParams().set('month', this.normalizeMonthParam(month));
    return this.http.get(`${this.exportsUrl}/attendance-monthly`, {
      params,
      observe: 'response',
      responseType: 'blob',
    });
  }

  // --- SHIFT TEMPLATES (REAL API) ---

  getShiftTemplates(activeOnly?: boolean, search?: string): Observable<ShiftTemplateResponse[]> {
    let params = new HttpParams();
    if (activeOnly !== undefined) {
      params = params.set('active', activeOnly.toString());
    }
    if (search) {
      params = params.set('q', search);
    }
    return this.http.get<ShiftTemplateResponse[]>(this.shiftsUrl, { params });
  }

  getShiftTemplateById(id: number): Observable<ShiftTemplateResponse> {
    return this.http.get<ShiftTemplateResponse>(`${this.shiftsUrl}/${id}`);
  }

  createShiftTemplate(shift: ShiftTemplateUpsertPayload): Observable<ShiftTemplateResponse> {
    return this.http.post<ShiftTemplateResponse>(this.shiftsUrl, shift);
  }

  updateShiftTemplate(id: number, shift: ShiftTemplateUpsertPayload): Observable<ShiftTemplateResponse> {
    return this.http.put<ShiftTemplateResponse>(`${this.shiftsUrl}/${id}`, shift);
  }

  setShiftTemplateActive(id: number, active: boolean): Observable<ShiftTemplateResponse> {
    return this.http.patch<ShiftTemplateResponse>(`${this.shiftsUrl}/${id}/active`, null, {
      params: { active: active.toString() }
    });
  }

  deleteShiftTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.shiftsUrl}/${id}`);
  }

  assignShiftRange(payload: AssignShiftRangeRequest): Observable<AssignShiftRangeResponse> {
    return this.http.post<AssignShiftRangeResponse>(`${this.schedulesUrl}/assign-range`, this.normalizeAssignShiftRangePayload(payload));
  }

  getScheduleEmployees(): Observable<ScheduleEmployee[]> {
    const departmentParams = new HttpParams()
      .set('page', '0')
      .set('size', '1000')
      .set('sort', 'departmentId,ASC');

    return forkJoin({
      employees: this.http.get<EmployeeLookupDto[]>(this.employeesUrl),
      departments: this.http.get<DepartmentPageDto>(this.departmentsUrl, { params: departmentParams }),
    }).pipe(
      map(({ employees, departments }) => {
        const departmentById = new Map<number, string>();
        (departments.content ?? []).forEach((department) => {
          departmentById.set(department.departmentId, department.departmentName ?? '');
        });

        return employees.map((employee) => ({
          id: String(employee.employeeId),
          name: employee.fullName ?? '',
          department: employee.departmentId ? (departmentById.get(employee.departmentId) ?? '') : '',
          employeeCode: employee.employeeCode ?? '',
        }));
      }),
    );
  }

  getScheduleByEmployeeDay(employeeId: number, date: string): Observable<EmployeeScheduleDayResponseDto[]> {
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return throwError(() => new Error('employeeId must be a positive integer.'));
    }
    return this.http.get<EmployeeScheduleDayResponseDto[]>(`${this.schedulesUrl}/by-employee/day`, {
      params: new HttpParams()
        .set('employeeId', employeeId.toString())
        .set('date', date),
    });
  }

  getInitialShifts(employeeIds: number[] = [], weekStart?: Date): Observable<Shift[]> {
    if (employeeIds.length === 0) {
      return of([]);
    }

    const normalizedWeekStart = this.normalizeStartOfDay(weekStart ?? new Date());
    const weekDates = Array.from({ length: 7 }, (_, dayOffset) => {
      const date = new Date(normalizedWeekStart);
      date.setDate(normalizedWeekStart.getDate() + dayOffset);
      return this.formatDate(date);
    });

    const requests = employeeIds.flatMap((employeeId) =>
      weekDates.map((date) =>
        this.http.get<EmployeeScheduleDayResponseDto[]>(`${this.schedulesUrl}/by-employee/day`, {
          params: new HttpParams()
            .set('employeeId', employeeId.toString())
            .set('date', date),
        }),
      ),
    );

    return forkJoin(requests).pipe(
      map((responses) =>
        responses
          .flat()
          .map((item) => {
            const day = this.diffDays(normalizedWeekStart, item.workDate);
            return {
              id: item.scheduleId.toString(),
              employeeId: item.employeeId.toString(),
              employeeName: '',
              day,
              startTime: this.toHourMinute(item.startTime),
              endTime: this.toHourMinute(item.endTime),
              type: this.deriveShiftType(item.isNightShift, item.startTime),
              shiftId: item.shiftId,
              workDate: item.workDate,
            } satisfies Shift;
          })
          .filter((item) => item.day >= 0 && item.day <= 6),
      ),
    );
  }

  private buildAttendanceDailyParams(from: string, to: string, page: number, size: number): HttpParams {
    return new HttpParams()
      .set('from', this.normalizeDateParam(from))
      .set('to', this.normalizeDateParam(to))
      .set('page', Math.max(0, page).toString())
      .set('size', Math.max(1, size).toString());
  }

  private normalizeAssignShiftRangePayload(payload: AssignShiftRangeRequest): AssignShiftRangeRequest {
    return {
      employeeId: Number(payload.employeeId),
      shiftId: Number(payload.shiftId),
      startDate: this.normalizeDateParam(payload.startDate),
      endDate: this.normalizeDateParam(payload.endDate),
      scheduleSource: payload.scheduleSource === 'IMPORT' ? 'IMPORT' : 'MANUAL',
      note: payload.note?.trim() || undefined,
      overwrite: Boolean(payload.overwrite),
    };
  }

  private normalizeMonthParam(month: string): string {
    return String(month ?? '').trim();
  }

  private normalizeDateParam(value: string): string {
    return String(value ?? '').trim();
  }

  private toHourMinute(value: string): string {
    return value ? value.substring(0, 5) : '';
  }

  private deriveShiftType(isNightShift: boolean, startTime: string): Shift['type'] {
    if (isNightShift) {
      return 'night';
    }
    const hour = Number((startTime || '').split(':')[0]);
    if (!Number.isFinite(hour)) {
      return 'morning';
    }
    return hour < 12 ? 'morning' : 'afternoon';
  }

  private normalizeStartOfDay(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private diffDays(weekStart: Date, workDate: string): number {
    const work = new Date(`${workDate}T00:00:00`);
    const diffMs = work.getTime() - weekStart.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }
}
