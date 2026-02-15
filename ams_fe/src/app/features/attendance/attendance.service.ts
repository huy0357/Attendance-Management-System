import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  id: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  shiftType: string;
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly baseUrl = `${environment.apiBaseUrl}/attendance`;
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
    return of([
      {
        id: 'OT-001',
        employeeId: 'EMP-042',
        employeeName: 'John Smith',
        employeeAvatar: 'JS',
        department: 'Engineering',
        position: 'Senior Developer',
        date: '2026-01-25',
        hours: 3,
        reason: 'Critical project deadline - need to complete authentication module',
        status: 'pending',
        submittedDate: '2026-01-22',
        estimatedPay: 150.0,
      },
      {
        id: 'OT-002',
        employeeId: 'EMP-015',
        employeeName: 'Alice Johnson',
        employeeAvatar: 'AJ',
        department: 'Engineering',
        position: 'Developer',
        date: '2026-01-24',
        hours: 2,
        reason: 'System maintenance and database optimization',
        status: 'pending',
        submittedDate: '2026-01-21',
        estimatedPay: 90.0,
      },
      {
        id: 'OT-003',
        employeeId: 'EMP-028',
        employeeName: 'Bob Williams',
        employeeAvatar: 'BW',
        department: 'Operations',
        position: 'Operations Specialist',
        date: '2026-01-23',
        hours: 4,
        reason: 'End of month reporting and data reconciliation',
        status: 'approved',
        submittedDate: '2026-01-20',
        reviewedBy: 'Sarah Chen',
        reviewedDate: '2026-01-20',
        reviewNotes: 'Approved - critical month-end tasks',
        estimatedPay: 180.0,
      },
      {
        id: 'OT-004',
        employeeId: 'EMP-055',
        employeeName: 'Carol Davis',
        employeeAvatar: 'CD',
        department: 'Sales',
        position: 'Sales Representative',
        date: '2026-01-22',
        hours: 2.5,
        reason: 'Client presentation preparation',
        status: 'approved',
        submittedDate: '2026-01-19',
        reviewedBy: 'Michael Ross',
        reviewedDate: '2026-01-19',
        reviewNotes: 'Approved - important client meeting',
        estimatedPay: 112.5,
      },
      {
        id: 'OT-005',
        employeeId: 'EMP-033',
        employeeName: 'David Martinez',
        employeeAvatar: 'DM',
        department: 'IT',
        position: 'IT Support',
        date: '2026-01-20',
        hours: 1.5,
        reason: 'Server upgrade after hours',
        status: 'rejected',
        submittedDate: '2026-01-18',
        reviewedBy: 'Sarah Chen',
        reviewedDate: '2026-01-18',
        reviewNotes: 'Rejected - can be done during regular hours with planning',
        estimatedPay: 67.5,
      },
      {
        id: 'OT-006',
        employeeId: 'EMP-042',
        employeeName: 'John Smith',
        employeeAvatar: 'JS',
        department: 'Engineering',
        position: 'Senior Developer',
        date: '2026-01-20',
        hours: 2,
        reason: 'System maintenance',
        status: 'approved',
        submittedDate: '2026-01-17',
        reviewedBy: 'Sarah Chen',
        reviewedDate: '2026-01-17',
        reviewNotes: 'Approved',
        estimatedPay: 100.0,
      },
      {
        id: 'OT-007',
        employeeId: 'EMP-042',
        employeeName: 'John Smith',
        employeeAvatar: 'JS',
        department: 'Engineering',
        position: 'Senior Developer',
        date: '2026-01-18',
        hours: 1.5,
        reason: 'Client demo preparation',
        status: 'approved',
        submittedDate: '2026-01-15',
        reviewedBy: 'Sarah Chen',
        reviewedDate: '2026-01-15',
        reviewNotes: 'Approved',
        estimatedPay: 75.0,
      }
    ]);
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

  getInitialShifts(): Observable<Shift[]> {
    return of([
      { id: '1', employeeId: '1', employeeName: 'Sarah Chen', day: 0, startTime: '08:00', endTime: '16:00', type: 'morning' },
      { id: '2', employeeId: '1', employeeName: 'Sarah Chen', day: 1, startTime: '08:00', endTime: '16:00', type: 'morning' },
      { id: '3', employeeId: '2', employeeName: 'Michael Ross', day: 0, startTime: '12:00', endTime: '20:00', type: 'afternoon' },
      { id: '4', employeeId: '3', employeeName: 'Emma Wilson', day: 2, startTime: '08:00', endTime: '16:00', type: 'morning' }
    ]);
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
}
