import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  RequestStatus,
  RequestsApprovalRequest,
  RequestsResponse,
  RequestsUpsertRequest,
} from '../../shared/models/requests.model';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  email: string;
  leaveType: 'Annual' | 'Sick' | 'Personal' | 'Maternity' | 'Paternity' | 'Unpaid';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedVia: 'Gmail' | 'Manual' | 'Portal';
  submittedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
  reviewNotes?: string;
}

export interface OtRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  department: string;
  position: string;
  date: string;
  hours: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
  reviewNotes?: string;
  estimatedPay?: number;
}

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
  isAiGenerated?: boolean;
  hasConflict?: boolean;
}

export interface TimeRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  scheduledIn: string;
  scheduledOut: string;
  regularHours: number;
  overtimeHours: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  status: 'on-time' | 'late' | 'early-leave' | 'absent' | 'overtime';
  violations: string[];
}

export interface EmployeeTimeData {
  id: string;
  name: string;
  avatar: string;
  department: string;
  position: string;
  records: TimeRecord[];
  summary: {
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalLateMinutes: number;
    totalEarlyLeaveMinutes: number;
    totalViolations: number;
    attendanceRate: number;
  };
}

export interface CalculationRule {
  id: string;
  name: string;
  type: 'overtime' | 'late' | 'early-leave' | 'absence';
  condition: string;
  penalty?: string;
  multiplier?: number;
  enabled: boolean;
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

interface EmployeeLookupDto {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  email: string;
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
  private readonly requestsUrl = `${environment.apiBaseUrl}/requests`;
  private readonly employeesUrl = `${environment.apiBaseUrl}/employees`;
  private readonly schedulesUrl = `${environment.apiBaseUrl}/v1/schedules`;
  private readonly shiftsUrl = `${environment.apiBaseUrl}/v1/shifts`;

  constructor(private http: HttpClient) { }

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

  createShiftTemplate(shift: any): Observable<ShiftTemplateResponse> {
    return this.http.post<ShiftTemplateResponse>(this.shiftsUrl, shift);
  }

  updateShiftTemplate(id: number, shift: any): Observable<ShiftTemplateResponse> {
    return this.http.put<ShiftTemplateResponse>(`${this.shiftsUrl}/${id}`, shift);
  }

  setShiftTemplateActive(id: number, active: boolean): Observable<void> {
    return this.http.patch<void>(`${this.shiftsUrl}/${id}/active`, null, {
      params: { active: active.toString() }
    });
  }

  deleteShiftTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.shiftsUrl}/${id}`);
  }

  findEmployeeByNameOrEmail(nameOrEmail: string, email?: string): Observable<EmployeeLookupDto | null> {
    const nameQuery = nameOrEmail.trim().toLowerCase();
    const emailQuery = (email ?? '').trim().toLowerCase();
    return this.http.get<EmployeeLookupDto[]>(this.employeesUrl).pipe(
      map((employees) => {
        const matched = employees.find((employee) => {
          const employeeName = employee.fullName?.toLowerCase() ?? '';
          const employeeEmail = employee.email?.toLowerCase() ?? '';
          return (
            employeeName === nameQuery ||
            employeeEmail === emailQuery ||
            employeeEmail === nameQuery ||
            employeeName.includes(nameQuery)
          );
        });
        return matched ?? null;
      }),
    );
  }

  createRequest(payload: RequestsUpsertRequest): Observable<RequestsResponse> {
    return this.http.post<RequestsResponse>(this.requestsUrl, payload);
  }

  approveRequest(requestId: number, status: RequestStatus, note?: string): Observable<RequestsResponse> {
    return this.resolveEmployeeIdFromUsername().pipe(
      switchMap((approverId) => {
        const payload: RequestsApprovalRequest = {
          approverId,
          status,
          decisionNote: note,
        };
        return this.http.put<RequestsResponse>(`${this.requestsUrl}/${requestId}/approval`, payload);
      }),
    );
  }

  getRequestsByEmployee(employeeId: number): Observable<RequestsResponse[]> {
    const params = new HttpParams().set('employeeId', employeeId.toString());
    return this.http.get<RequestsResponse[]>(this.requestsUrl, { params });
  }

  updateRequest(requestId: number, payload: RequestsUpsertRequest): Observable<RequestsResponse> {
    return this.http.put<RequestsResponse>(`${this.requestsUrl}/${requestId}`, payload);
  }

  deleteRequest(requestId: number): Observable<void> {
    return this.http.delete<void>(`${this.requestsUrl}/${requestId}`);
  }

  assignShiftRange(payload: AssignShiftRangeRequest): Observable<AssignShiftRangeResponse> {
    return this.http.post<AssignShiftRangeResponse>(`${this.schedulesUrl}/assign-range`, payload);
  }

  // --- LEAVE & OT (MOCKS) ---
  getLeaveRequests(): Observable<LeaveRequest[]> {
    return of([
      {
        id: 'LR001',
        employeeId: 'EMP001',
        employeeName: 'Sarah Chen',
        department: 'Operations',
        email: 'sarah.chen@company.com',
        leaveType: 'Annual',
        startDate: '2026-02-10',
        endDate: '2026-02-14',
        days: 5,
        reason: 'Family vacation to Europe. Flight tickets already booked.',
        status: 'Pending',
        submittedVia: 'Gmail',
        submittedDate: '2026-01-20'
      },
      {
        id: 'LR005',
        employeeId: 'EMP005',
        employeeName: 'Lisa Wong',
        department: 'Finance',
        email: 'lisa.wong@company.com',
        leaveType: 'Maternity',
        startDate: '2026-05-01',
        endDate: '2026-08-01',
        days: 90,
        reason: 'Maternity Leave',
        status: 'Approved',
        submittedVia: 'Portal',
        submittedDate: '2026-01-10',
        reviewedBy: 'Robert Taylor',
        reviewedDate: '2026-01-11',
        reviewNotes: 'Approved as per policy'
      }
    ]);
  }

  getOtRequests(): Observable<OtRequest[]> {
    return this.resolveEmployeeIdFromUsername().pipe(
      switchMap((employeeId) => {
        const params = new HttpParams().set('employeeId', employeeId.toString());
        return this.http.get<RequestsResponse[]>(this.requestsUrl, { params });
      }),
      map((requests) =>
        requests
          .filter((request) => request.requestType === 'OVERTIME')
          .map((request) => this.mapRequestToOt(request)),
      ),
    );
  }

  getScheduleEmployees(): Observable<ScheduleEmployee[]> {
    return of([
      { id: '1', name: 'Sarah Chen', department: 'Operations' },
      { id: '2', name: 'Michael Ross', department: 'Operations' },
      { id: '3', name: 'Emma Wilson', department: 'Customer Service' },
      { id: '4', name: 'James Kim', department: 'Customer Service' },
      { id: '5', name: 'Lisa Wong', department: 'Sales' },
      { id: '6', name: 'David Kumar', department: 'Sales' }
    ]);
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

  getCalculationRules(): Observable<CalculationRule[]> {
    return of([
      {
        id: 'R-001',
        name: 'Standard Working Hours',
        type: 'overtime',
        condition: '8 hours per day, 40 hours per week',
        multiplier: 1.0,
        enabled: true,
      },
      {
        id: 'R-002',
        name: 'Weekday Overtime',
        type: 'overtime',
        condition: 'Hours exceeding 8 per day on weekdays',
        multiplier: 1.5,
        enabled: true,
      },
      {
        id: 'R-003',
        name: 'Weekend Overtime',
        type: 'overtime',
        condition: 'All hours worked on Saturday/Sunday',
        multiplier: 2.0,
        enabled: true,
      },
      {
        id: 'R-004',
        name: 'Late Check-in Penalty',
        type: 'late',
        condition: 'More than 5 minutes after scheduled time',
        penalty: '15 minutes deduction per occurrence',
        enabled: true,
      },
      {
        id: 'R-005',
        name: 'Early Leave Penalty',
        type: 'early-leave',
        condition: 'More than 5 minutes before scheduled end',
        penalty: 'Actual time + 15 minutes deduction',
        enabled: true,
      },
      {
        id: 'R-006',
        name: 'Absence Without Leave',
        type: 'absence',
        condition: 'No check-in and no approved leave',
        penalty: 'Full day deduction + warning',
        enabled: true,
      }
    ]);
  }

  getEmployeeTimeData(): Observable<EmployeeTimeData[]> {
    return of([
      {
        id: 'EMP-001',
        name: 'Sarah Chen',
        avatar: 'SC',
        department: 'Operations',
        position: 'VP Operations',
        records: [
          {
            id: 'TR-001',
            date: '2026-01-20',
            checkIn: '08:55',
            checkOut: '18:30',
            scheduledIn: '09:00',
            scheduledOut: '18:00',
            regularHours: 8.0,
            overtimeHours: 0.5,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            status: 'overtime',
            violations: [],
          },
          {
            id: 'TR-002',
            date: '2026-01-21',
            checkIn: '09:12',
            checkOut: '18:05',
            scheduledIn: '09:00',
            scheduledOut: '18:00',
            regularHours: 7.75,
            overtimeHours: 0,
            lateMinutes: 12,
            earlyLeaveMinutes: 0,
            status: 'late',
            violations: ['Late check-in: 12 minutes'],
          },
          {
            id: 'TR-003',
            date: '2026-01-22',
            checkIn: '08:58',
            checkOut: '17:50',
            scheduledIn: '09:00',
            scheduledOut: '18:00',
            regularHours: 7.75,
            overtimeHours: 0,
            lateMinutes: 0,
            earlyLeaveMinutes: 10,
            status: 'early-leave',
            violations: ['Early departure: 10 minutes'],
          },
          {
            id: 'TR-004',
            date: '2026-01-23',
            checkIn: '08:57',
            checkOut: '18:00',
            scheduledIn: '09:00',
            scheduledOut: '18:00',
            regularHours: 8.0,
            overtimeHours: 0,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            status: 'on-time',
            violations: [],
          },
          {
            id: 'TR-005',
            date: '2026-01-24',
            checkIn: '08:55',
            checkOut: '19:15',
            scheduledIn: '09:00',
            scheduledOut: '18:00',
            regularHours: 8.0,
            overtimeHours: 1.25,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            status: 'overtime',
            violations: [],
          },
        ],
        summary: {
          totalRegularHours: 39.5,
          totalOvertimeHours: 1.75,
          totalLateMinutes: 12,
          totalEarlyLeaveMinutes: 10,
          totalViolations: 2,
          attendanceRate: 100,
        },
      },
      {
        id: 'EMP-002',
        name: 'Michael Ross',
        avatar: 'MR',
        department: 'Sales',
        position: 'VP Sales',
        records: [
          {
            id: 'TR-006',
            date: '2026-01-20',
            checkIn: '09:05',
            checkOut: '18:10',
            scheduledIn: '09:00',
            scheduledOut: '18:00',
            regularHours: 8.0,
            overtimeHours: 0.17,
            lateMinutes: 5,
            earlyLeaveMinutes: 0,
            status: 'late',
            violations: ['Late check-in: 5 minutes'],
          },
          {
            id: 'TR-007',
            date: '2026-01-21',
            checkIn: '09:15',
            checkOut: '20:00',
            scheduledIn: '09:00',
            scheduledOut: '18:00',
            regularHours: 8.0,
            overtimeHours: 1.75,
            lateMinutes: 15,
            earlyLeaveMinutes: 0,
            status: 'late',
            violations: ['Late check-in: 15 minutes'],
          },
          {
            id: 'TR-008',
            date: '2026-01-22',
            checkIn: '08:58',
            checkOut: '18:05',
            scheduledIn: '09:00',
            scheduledOut: '18:00',
            regularHours: 8.0,
            overtimeHours: 0.08,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            status: 'on-time',
            violations: [],
          },
          {
            id: 'TR-009',
            date: '2026-01-23',
            checkIn: '09:00',
            checkOut: '18:00',
            scheduledIn: '09:00',
            scheduledOut: '18:00',
            regularHours: 8.0,
            overtimeHours: 0,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            status: 'on-time',
            violations: [],
          },
          {
            id: 'TR-010',
            date: '2026-01-24',
            checkIn: '09:10',
            checkOut: '18:30',
            scheduledIn: '09:00',
            scheduledOut: '18:00',
            regularHours: 8.0,
            overtimeHours: 0.33,
            lateMinutes: 10,
            earlyLeaveMinutes: 0,
            status: 'late',
            violations: ['Late check-in: 10 minutes'],
          },
        ],
        summary: {
          totalRegularHours: 40.0,
          totalOvertimeHours: 2.33,
          totalLateMinutes: 30,
          totalEarlyLeaveMinutes: 0,
          totalViolations: 3,
          attendanceRate: 100,
        },
      },
    ]);
  }

  private resolveEmployeeIdFromUsername(): Observable<number> {
    const username = (localStorage.getItem('ams.username') || '').trim().toLowerCase();
    if (!username) {
      return throwError(() => new Error('Missing username in auth context.'));
    }

    return this.http.get<EmployeeLookupDto[]>(this.employeesUrl).pipe(
      map((employees) => {
        const match = employees.find((employee) => {
          const name = employee.fullName?.toLowerCase() ?? '';
          const email = employee.email?.toLowerCase() ?? '';
          const code = employee.employeeCode?.toLowerCase() ?? '';
          return email === username || name === username || code === username;
        });
        if (!match) {
          throw new Error(`Employee not found for username '${username}'.`);
        }
        return match.employeeId;
      }),
    );
  }

  private mapRequestToOt(request: RequestsResponse): OtRequest {
    const employeeName = request.employeeName ?? '';
    return {
      id: String(request.requestId),
      employeeId: String(request.employeeId ?? ''),
      employeeName,
      employeeAvatar: this.toInitials(employeeName),
      department: '',
      position: '',
      date: request.startDatetime ?? request.endDatetime ?? request.submittedAt ?? '',
      hours: this.calculateHours(request.startDatetime, request.endDatetime),
      reason: request.reason ?? '',
      status: this.mapRequestStatus(request.status),
      submittedDate: request.submittedAt ?? request.startDatetime ?? '',
      reviewedBy: request.approverName ?? undefined,
      reviewNotes: request.decisionNote ?? undefined,
      estimatedPay: undefined,
    };
  }

  private mapRequestStatus(status: RequestStatus): OtRequest['status'] {
    if (status === 'APPROVED') {
      return 'approved';
    }
    if (status === 'REJECTED' || status === 'CANCELLED') {
      return 'rejected';
    }
    return 'pending';
  }

  private calculateHours(start?: string, end?: string): number {
    if (!start || !end) {
      return 0;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 0;
    }
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs <= 0) {
      return 0;
    }
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  }

  private toInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '';
    }
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
    return initials.join('');
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
