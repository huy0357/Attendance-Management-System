import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReportType {
  id: 'attendance' | 'payroll' | 'productivity' | 'overtime';
  name: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

export interface AttendanceTrend {
  month: string;
  present: number;
  late: number;
  absent: number;
}

export interface DepartmentStat {
  name: string;
  employees: number;
  attendance: number;
  avgHours: number;
}

export interface TopPerformer {
  name: string;
  department: string;
  attendance: number;
  punctuality: number;
}

export interface ReportField {
  id: string;
  name: string;
  category: string;
  type: 'text' | 'number' | 'date' | 'boolean';
}

export interface ReportFilter {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface SavedReport {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: string[];
  filters: ReportFilter[];
  createdDate: string;
  lastRun: string;
  chartType: string;
}

export interface ReportOperator {
  value: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly baseUrl = `${environment.apiBaseUrl}/reports`;

  constructor(private http: HttpClient) {}

  // TODO (NO API YET): Replace mock data with real endpoints under /api/reports.
  getReportTypes(): Observable<ReportType[]> {
    return of([
      { id: 'attendance', name: 'Attendance Report', icon: 'users', color: 'blue' },
      { id: 'payroll', name: 'Payroll Summary', icon: 'dollar-sign', color: 'green' },
      { id: 'productivity', name: 'Productivity Metrics', icon: 'trending-up', color: 'purple' },
      { id: 'overtime', name: 'Overtime Analysis', icon: 'clock', color: 'yellow' },
    ]);
  }

  getAttendanceTrends(): Observable<AttendanceTrend[]> {
    return of([
      { month: 'Jan', present: 94, late: 4, absent: 2 },
      { month: 'Feb', present: 96, late: 3, absent: 1 },
      { month: 'Mar', present: 92, late: 5, absent: 3 },
      { month: 'Apr', present: 95, late: 3, absent: 2 },
      { month: 'May', present: 97, late: 2, absent: 1 },
      { month: 'Jun', present: 93, late: 4, absent: 3 },
    ]);
  }

  getDepartmentStats(): Observable<DepartmentStat[]> {
    return of([
      { name: 'Operations', employees: 45, attendance: 96, avgHours: 42 },
      { name: 'Sales', employees: 32, attendance: 94, avgHours: 44 },
      { name: 'Customer Service', employees: 28, attendance: 98, avgHours: 40 },
      { name: 'HR', employees: 12, attendance: 97, avgHours: 41 },
      { name: 'IT', employees: 18, attendance: 95, avgHours: 43 },
    ]);
  }

  getTopPerformers(): Observable<TopPerformer[]> {
    return of([
      { name: 'Sarah Chen', department: 'Operations', attendance: 100, punctuality: 98 },
      { name: 'Emma Wilson', department: 'Customer Service', attendance: 100, punctuality: 100 },
      { name: 'Michael Ross', department: 'Sales', attendance: 98, punctuality: 96 },
      { name: 'James Kim', department: 'Operations', attendance: 97, punctuality: 99 },
      { name: 'Lisa Wong', department: 'Sales', attendance: 96, punctuality: 95 },
    ]);
  }

  getAvailableFields(): Observable<ReportField[]> {
    return of([
      { id: 'emp_id', name: 'Employee ID', category: 'employee', type: 'text' },
      { id: 'emp_name', name: 'Employee Name', category: 'employee', type: 'text' },
      { id: 'department', name: 'Department', category: 'employee', type: 'text' },
      { id: 'position', name: 'Position', category: 'employee', type: 'text' },
      { id: 'hire_date', name: 'Hire Date', category: 'employee', type: 'date' },
      { id: 'check_in', name: 'Check-in Time', category: 'attendance', type: 'date' },
      { id: 'check_out', name: 'Check-out Time', category: 'attendance', type: 'date' },
      { id: 'work_hours', name: 'Work Hours', category: 'attendance', type: 'number' },
      { id: 'late_minutes', name: 'Late Minutes', category: 'attendance', type: 'number' },
      { id: 'attendance_status', name: 'Attendance Status', category: 'attendance', type: 'text' },
      { id: 'leave_type', name: 'Leave Type', category: 'leave', type: 'text' },
      { id: 'leave_start', name: 'Leave Start Date', category: 'leave', type: 'date' },
      { id: 'leave_end', name: 'Leave End Date', category: 'leave', type: 'date' },
      { id: 'leave_days', name: 'Leave Days', category: 'leave', type: 'number' },
      { id: 'leave_balance', name: 'Leave Balance', category: 'leave', type: 'number' },
      { id: 'basic_salary', name: 'Basic Salary', category: 'payroll', type: 'number' },
      { id: 'overtime_pay', name: 'Overtime Pay', category: 'payroll', type: 'number' },
      { id: 'deductions', name: 'Deductions', category: 'payroll', type: 'number' },
      { id: 'net_salary', name: 'Net Salary', category: 'payroll', type: 'number' },
      { id: 'payroll_month', name: 'Payroll Month', category: 'payroll', type: 'date' },
      { id: 'kpi_score', name: 'KPI Score', category: 'performance', type: 'number' },
      { id: 'review_score', name: 'Review Score', category: 'performance', type: 'number' },
      { id: 'review_period', name: 'Review Period', category: 'performance', type: 'text' },
    ]);
  }

  getOperators(): Observable<ReportOperator[]> {
    return of([
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' },
      { value: 'greater_than', label: 'Greater Than' },
      { value: 'less_than', label: 'Less Than' },
      { value: 'contains', label: 'Contains' },
      { value: 'between', label: 'Between' },
    ]);
  }

  getSavedReports(): Observable<SavedReport[]> {
    return of([
      {
        id: '1',
        name: 'Monthly Attendance Summary',
        description: 'Complete attendance report for the current month',
        category: 'Attendance',
        fields: ['emp_name', 'department', 'work_hours', 'late_minutes'],
        filters: [],
        createdDate: '2025-01-15',
        lastRun: '2025-01-23',
        chartType: 'table',
      },
      {
        id: '2',
        name: 'Department Payroll Analysis',
        description: 'Payroll breakdown by department',
        category: 'Payroll',
        fields: ['department', 'basic_salary', 'overtime_pay', 'net_salary'],
        filters: [],
        createdDate: '2025-01-10',
        lastRun: '2025-01-20',
        chartType: 'bar',
      },
      {
        id: '3',
        name: 'Leave Balance Report',
        description: 'Current leave balances for all employees',
        category: 'Leave',
        fields: ['emp_name', 'department', 'leave_type', 'leave_balance'],
        filters: [],
        createdDate: '2025-01-05',
        lastRun: '2025-01-22',
        chartType: 'table',
      },
      {
        id: '4',
        name: 'Performance by Department',
        description: 'KPI scores grouped by department',
        category: 'Performance',
        fields: ['department', 'kpi_score', 'review_score'],
        filters: [],
        createdDate: '2024-12-20',
        lastRun: '2025-01-18',
        chartType: 'pie',
      },
    ]);
  }
}
