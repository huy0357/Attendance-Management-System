import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DepartmentDto, DepartmentRequest } from '../../shared/models/department.model';

export interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  joinDate: string;
  avatar: string;
  manager: string;
  employeeType: string;
  baseSalary: number;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'present' | 'late' | 'absent';
  regularHours: number;
  overtimeHours: number;
}

export interface PayrollRecord {
  id: string;
  period: string;
  baseSalary: number;
  overtime: number;
  bonus: number;
  deductions: number;
  tax: number;
  netPay: number;
  status: 'paid' | 'pending' | 'processing';
}

export interface OTRequest {
  id: string;
  date: string;
  hours: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ShiftChangeRequest {
  id: string;
  currentDate: string;
  requestedDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export type ContractType = 'permanent' | 'contract' | 'probation' | 'intern' | 'part-time';
export type ContractStatus = 'active' | 'expired' | 'pending' | 'terminated';

export interface ContractRenewal {
  date: string;
  previousEndDate: string;
  newEndDate: string;
  reason: string;
}

export interface ContractRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  department: string;
  position: string;
  contractType: ContractType;
  startDate: string;
  endDate?: string;
  baseSalary: number;
  currency: string;
  benefits: string[];
  status: ContractStatus;
  signedDate?: string;
  documentUrl?: string;
  notes?: string;
  renewalHistory?: ContractRenewal[];
}

export interface ContractStats {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
}

export interface OrgEmployee {
  id: string;
  name: string;
  title: string;
  avatar: string;
  departmentId: string;
  departmentName: string;
  subordinates?: string[];
}

export interface OrgDepartment {
  id: string;
  name: string;
  description: string;
}

export interface DepartmentOverview {
  departmentId: string;
  totalMembers: number;
  leadName: string;
  highlights: string[];
  topMembers: string[];
}

export interface TransferEmployeePayload {
  employeeId: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  effectiveDate?: string;
}

export type ReviewStatus = 'draft' | 'pending' | 'completed';

export interface KpiDefinition {
  id: string;
  name: string;
  category: string;
  target: number;
  weight: number;
  unit: string;
  frequency: string;
}

export interface PerformanceReviewRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  reviewPeriod: string;
  status: ReviewStatus;
  overallScore: number;
  salaryImpact: number;
  bonusImpact: number;
}

export interface ReviewStats {
  completed: number;
  pending: number;
  avgScore: number;
  totalBonusImpact: number;
}

export interface ReviewTemplate {
  id: string;
  name: string;
  kpiCount: number;
  usageCount: number;
  description: string;
}

export type OnboardingStatus = 'not-started' | 'in-progress' | 'completed';
export type OffboardingStatus = 'initiated' | 'in-progress' | 'completed';
export type TaskStatus = 'pending' | 'in-progress' | 'completed';

export interface OnboardingProcess {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  position: string;
  startDate: string;
  status: OnboardingStatus;
  progress: number;
  tasksCompleted: number;
  totalTasks: number;
}

export interface OffboardingProcess {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  lastDay: string;
  reason: string;
  status: OffboardingStatus;
  progress: number;
}

export interface ProcessTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: TaskStatus;
  category: string;
}

export interface ProcessStats {
  active: number;
  upcomingOrPending: number;
  completed: number;
  averageDurationLabel: string;
}

export interface ProcessTemplate {
  id: string;
  name: string;
  type: 'onboarding' | 'offboarding';
  taskCount: number;
  timelineDays: number;
}

export interface TaskCategory {
  id: string;
  label: string;
  type: 'onboarding' | 'offboarding';
}

export interface NewProcessPayload {
  type: 'onboarding' | 'offboarding';
  employeeId: string;
  employeeName: string;
  department: string;
  position?: string;
  startDate?: string;
  lastDay?: string;
  reason?: string;
  templateId: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class HrmService {
  private readonly baseUrl = `${environment.apiBaseUrl}/hrm`;
  private readonly departmentsUrl = `${environment.apiBaseUrl}/departments`;

  constructor(private http: HttpClient) { }

  // TODO (NO API YET): Replace mock data with real endpoints under /api/hrm.
  getEmployeeProfile(): Observable<EmployeeProfile> {
    return of({
      id: 'EMP-042',
      name: 'John Smith',
      email: 'john.smith@company.com',
      department: 'Engineering',
      position: 'Senior Developer',
      joinDate: '2023-06-15',
      avatar: 'JS',
      manager: 'Sarah Chen',
      employeeType: 'Full-time',
      baseSalary: 85000,
    });
  }

  getAttendanceRecords(): Observable<AttendanceRecord[]> {
    return of([
      {
        id: 'ATT-001',
        date: '2026-01-22',
        checkIn: '08:58',
        checkOut: '18:05',
        status: 'present',
        regularHours: 8.0,
        overtimeHours: 0.12,
      },
      {
        id: 'ATT-002',
        date: '2026-01-21',
        checkIn: '09:10',
        checkOut: '18:00',
        status: 'late',
        regularHours: 7.83,
        overtimeHours: 0,
      },
      {
        id: 'ATT-003',
        date: '2026-01-20',
        checkIn: '09:00',
        checkOut: '19:30',
        status: 'present',
        regularHours: 8.0,
        overtimeHours: 1.5,
      },
      {
        id: 'ATT-004',
        date: '2026-01-17',
        checkIn: '08:55',
        checkOut: '18:00',
        status: 'present',
        regularHours: 8.0,
        overtimeHours: 0,
      },
      {
        id: 'ATT-005',
        date: '2026-01-16',
        checkIn: '09:05',
        checkOut: '18:10',
        status: 'late',
        regularHours: 8.0,
        overtimeHours: 0.08,
      },
    ]);
  }

  getPayrollRecords(): Observable<PayrollRecord[]> {
    return of([
      {
        id: 'PAY-2026-01',
        period: 'January 2026',
        baseSalary: 7083.33,
        overtime: 450.0,
        bonus: 500.0,
        deductions: 250.0,
        tax: 1556.67,
        netPay: 6226.66,
        status: 'paid',
      },
      {
        id: 'PAY-2025-12',
        period: 'December 2025',
        baseSalary: 7083.33,
        overtime: 300.0,
        bonus: 1000.0,
        deductions: 250.0,
        tax: 1626.67,
        netPay: 6506.66,
        status: 'paid',
      },
      {
        id: 'PAY-2025-11',
        period: 'November 2025',
        baseSalary: 7083.33,
        overtime: 225.0,
        bonus: 0,
        deductions: 250.0,
        tax: 1411.67,
        netPay: 5646.66,
        status: 'paid',
      },
    ]);
  }

  getOtRequests(): Observable<OTRequest[]> {
    return of([
      {
        id: 'OT-001',
        date: '2026-01-25',
        hours: 3,
        reason: 'Critical project deadline',
        status: 'approved',
      },
      {
        id: 'OT-002',
        date: '2026-01-20',
        hours: 2,
        reason: 'System maintenance',
        status: 'approved',
      },
      {
        id: 'OT-003',
        date: '2026-01-18',
        hours: 1.5,
        reason: 'Client demo preparation',
        status: 'pending',
      },
    ]);
  }

  getShiftChangeRequests(): Observable<ShiftChangeRequest[]> {
    return of([
      {
        id: 'SH-001',
        currentDate: '2026-01-28',
        requestedDate: '2026-01-30',
        reason: 'Personal appointment',
        status: 'pending',
      },
      {
        id: 'SH-002',
        currentDate: '2026-01-15',
        requestedDate: '2026-01-16',
        reason: 'Family emergency',
        status: 'approved',
      },
    ]);
  }

  // TODO (NO API YET): Contracts endpoints are not available in ams_be. Replace with /api/hrm/contracts when ready.
  getContracts(): Observable<ContractRecord[]> {
    return of(this.getMockContracts());
  }

  getContractStats(): Observable<ContractStats> {
    const contracts = this.getMockContracts();
    const expiringSoon = contracts.filter((contract) => {
      if (!contract.endDate) return false;
      const today = new Date();
      const expiry = new Date(contract.endDate);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 90;
    }).length;

    return of({
      total: contracts.length,
      active: contracts.filter((contract) => contract.status === 'active').length,
      expiringSoon,
      expired: contracts.filter((contract) => contract.status === 'expired').length,
    });
  }

  getContractHistory(contractId: string): Observable<ContractRenewal[]> {
    const contract = this.getMockContracts().find((item) => item.id === contractId);
    return of(contract?.renewalHistory || []);
  }

  createContract(contract: ContractRecord): Observable<ContractRecord> {
    return of(contract);
  }

  deleteContract(contractId: string): Observable<boolean> {
    return of(!!contractId);
  }

  // getOrgChart remains mock: BE has no employee-centric org chart endpoint.
  getOrgChart(): Observable<OrgEmployee[]> {
    return of(this.getMockOrgEmployees());
  }

  // ====== DEPARTMENT ENDPOINTS (wired to BE /api/departments) ======

  /** GET /api/departments/tree → mapped to OrgDepartment[] for UI compatibility. */
  getDepartments(): Observable<OrgDepartment[]> {
    return this.http.get<DepartmentDto[]>(`${this.departmentsUrl}/tree`).pipe(
      map((depts) => this.flattenDepartmentTree(depts)),
    );
  }

  getDepartmentOverview(deptId: string): Observable<DepartmentOverview> {
    const employees = this.getMockOrgEmployees();
    const departmentEmployees = employees.filter((emp) => emp.departmentId === deptId);
    const leadName = departmentEmployees.length > 0 ? departmentEmployees[0].name : 'TBD';

    return of({
      departmentId: deptId,
      totalMembers: departmentEmployees.length,
      leadName,
      highlights: [
        'Succession planning in progress',
        'Training budget allocated for Q2',
        'Workload balanced across teams',
      ],
      topMembers: departmentEmployees.slice(0, 4).map((emp) => emp.name),
    });
  }

  transferEmployee(payload: TransferEmployeePayload): Observable<boolean> {
    return of(!!payload.employeeId);
  }

  /** GET /api/departments/{id} */
  getDepartmentById(id: number): Observable<DepartmentDto> {
    return this.http.get<DepartmentDto>(`${this.departmentsUrl}/${id}`);
  }

  /** POST /api/departments */
  createDepartment(request: DepartmentRequest): Observable<DepartmentDto> {
    return this.http.post<DepartmentDto>(this.departmentsUrl, request);
  }

  /** PUT /api/departments/{id} */
  updateDepartment(id: number, request: DepartmentRequest): Observable<DepartmentDto> {
    return this.http.put<DepartmentDto>(`${this.departmentsUrl}/${id}`, request);
  }

  /** DELETE /api/departments/{id} */
  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.departmentsUrl}/${id}`);
  }

  /** Flatten nested DepartmentDto tree into flat OrgDepartment[] for UI. */
  private flattenDepartmentTree(depts: DepartmentDto[]): OrgDepartment[] {
    const result: OrgDepartment[] = [];
    const flatten = (list: DepartmentDto[]): void => {
      for (const d of list) {
        result.push({
          id: String(d.departmentId),
          name: d.departmentName,
          description: d.departmentCode ?? '',
        });
        if (d.children && d.children.length > 0) {
          flatten(d.children);
        }
      }
    };
    flatten(depts);
    return result;
  }

  // TODO (NO API YET): Performance & KPI endpoints are not available in ams_be.
  getKpiDefinitions(): Observable<KpiDefinition[]> {
    return of(this.getMockKpiDefinitions());
  }

  createKpiDefinition(payload: KpiDefinition): Observable<KpiDefinition> {
    return of(payload);
  }

  getReviewStats(): Observable<ReviewStats> {
    const reviews = this.getMockPerformanceReviews();
    const completed = reviews.filter((review) => review.status === 'completed').length;
    const pending = reviews.filter((review) => review.status === 'pending').length;
    const scored = reviews.filter((review) => review.overallScore > 0);
    const avgScore =
      scored.length > 0
        ? Math.round(scored.reduce((sum, review) => sum + review.overallScore, 0) / scored.length)
        : 0;
    const totalBonusImpact = reviews.reduce((sum, review) => sum + review.bonusImpact, 0);

    return of({
      completed,
      pending,
      avgScore,
      totalBonusImpact,
    });
  }

  getPerformanceReviews(): Observable<PerformanceReviewRecord[]> {
    return of(this.getMockPerformanceReviews());
  }

  createOrUpdateReview(payload: PerformanceReviewRecord): Observable<PerformanceReviewRecord> {
    return of(payload);
  }

  getReviewTemplates(): Observable<ReviewTemplate[]> {
    return of(this.getMockReviewTemplates());
  }

  // TODO (NO API YET): Onboarding/Offboarding endpoints are not available in ams_be.
  getOnboardingStats(): Observable<ProcessStats> {
    return of({
      active: 2,
      upcomingOrPending: 1,
      completed: 1,
      averageDurationLabel: '15 days',
    });
  }

  getOnboardingList(): Observable<OnboardingProcess[]> {
    return of(this.getMockOnboardingProcesses());
  }

  getOffboardingStats(): Observable<ProcessStats> {
    return of({
      active: 2,
      upcomingOrPending: 8,
      completed: 1,
      averageDurationLabel: '12 days',
    });
  }

  getOffboardingList(): Observable<OffboardingProcess[]> {
    return of(this.getMockOffboardingProcesses());
  }

  getProcessTemplates(): Observable<ProcessTemplate[]> {
    return of(this.getMockProcessTemplates());
  }

  getTaskCategories(): Observable<TaskCategory[]> {
    return of([
      { id: 'pre-boarding', label: 'Pre-boarding', type: 'onboarding' },
      { id: 'day-1', label: 'Day 1', type: 'onboarding' },
      { id: 'week-1', label: 'Week 1', type: 'onboarding' },
      { id: 'first-month', label: 'First Month', type: 'onboarding' },
      { id: 'probation', label: 'Probation', type: 'onboarding' },
      { id: 'pre-exit', label: 'Pre-exit', type: 'offboarding' },
      { id: 'last-day', label: 'Last Day', type: 'offboarding' },
      { id: 'post-exit', label: 'Post-exit', type: 'offboarding' },
    ]);
  }

  getTaskDetails(taskId: string): Observable<ProcessTask[]> {
    if (taskId === 'offboarding') {
      return of(this.getMockOffboardingTasks());
    }
    return of(this.getMockOnboardingTasks());
  }

  createNewProcess(payload: NewProcessPayload): Observable<boolean> {
    return of(!!payload.employeeId);
  }

  private getMockContracts(): ContractRecord[] {
    return [
      {
        id: 'CT-001',
        employeeId: 'EMP-001',
        employeeName: 'Sarah Chen',
        employeeAvatar: 'SC',
        department: 'Operations',
        position: 'VP Operations',
        contractType: 'permanent',
        startDate: '2020-01-15',
        baseSalary: 120000,
        currency: 'USD',
        benefits: ['Health Insurance', 'Dental', '401(k) Matching', 'PTO - 25 days'],
        status: 'active',
        signedDate: '2020-01-10',
        documentUrl: '/contracts/CT-001.pdf',
        notes: 'Renewed contract with salary increase effective 2024.',
        renewalHistory: [
          {
            date: '2024-01-15',
            previousEndDate: 'N/A',
            newEndDate: 'Permanent',
            reason: 'Promotion to VP with permanent contract',
          },
        ],
      },
      {
        id: 'CT-002',
        employeeId: 'EMP-002',
        employeeName: 'Michael Ross',
        employeeAvatar: 'MR',
        department: 'Sales',
        position: 'VP Sales',
        contractType: 'permanent',
        startDate: '2020-03-20',
        baseSalary: 115000,
        currency: 'USD',
        benefits: ['Health Insurance', 'Dental', '401(k) Matching', 'PTO - 25 days', 'Commission Plan'],
        status: 'active',
        signedDate: '2020-03-15',
        documentUrl: '/contracts/CT-002.pdf',
        notes: 'Includes performance-based commission structure.',
      },
      {
        id: 'CT-003',
        employeeId: 'EMP-003',
        employeeName: 'Emma Wilson',
        employeeAvatar: 'EW',
        department: 'HR',
        position: 'VP Human Resources',
        contractType: 'permanent',
        startDate: '2019-11-10',
        baseSalary: 110000,
        currency: 'USD',
        benefits: ['Health Insurance', 'Dental', 'Vision', '401(k) Matching', 'PTO - 30 days'],
        status: 'active',
        signedDate: '2019-11-05',
        documentUrl: '/contracts/CT-003.pdf',
      },
      {
        id: 'CT-004',
        employeeId: 'EMP-004',
        employeeName: 'James Kim',
        employeeAvatar: 'JK',
        department: 'Operations',
        position: 'Operations Manager',
        contractType: 'contract',
        startDate: '2025-01-01',
        endDate: '2026-12-31',
        baseSalary: 85000,
        currency: 'USD',
        benefits: ['Health Insurance', 'PTO - 15 days'],
        status: 'active',
        signedDate: '2024-12-15',
        documentUrl: '/contracts/CT-004.pdf',
        notes: '2-year fixed-term contract. Review for permanent position in 2026.',
      },
      {
        id: 'CT-005',
        employeeId: 'EMP-005',
        employeeName: 'Lisa Wong',
        employeeAvatar: 'LW',
        department: 'Operations',
        position: 'Operations Manager',
        contractType: 'contract',
        startDate: '2025-06-01',
        endDate: '2026-05-31',
        baseSalary: 83000,
        currency: 'USD',
        benefits: ['Health Insurance', 'PTO - 15 days'],
        status: 'active',
        signedDate: '2025-05-20',
        documentUrl: '/contracts/CT-005.pdf',
        notes: '1-year contract with potential for renewal.',
      },
      {
        id: 'CT-006',
        employeeId: 'EMP-006',
        employeeName: 'Alex Thompson',
        employeeAvatar: 'AT',
        department: 'Engineering',
        position: 'Junior Developer',
        contractType: 'probation',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        baseSalary: 65000,
        currency: 'USD',
        benefits: ['Health Insurance', 'PTO - 10 days'],
        status: 'active',
        signedDate: '2025-12-20',
        documentUrl: '/contracts/CT-006.pdf',
        notes: '3-month probation period. Evaluation scheduled for March 31, 2026.',
      },
      {
        id: 'CT-007',
        employeeId: 'EMP-007',
        employeeName: 'Maria Garcia',
        employeeAvatar: 'MG',
        department: 'Marketing',
        position: 'Marketing Intern',
        contractType: 'intern',
        startDate: '2025-09-01',
        endDate: '2025-12-31',
        baseSalary: 30000,
        currency: 'USD',
        benefits: ['Basic Health Coverage'],
        status: 'expired',
        signedDate: '2025-08-15',
        documentUrl: '/contracts/CT-007.pdf',
        notes: 'Summer internship program. Contract expired.',
      },
    ];
  }

  private getMockOrgEmployees(): OrgEmployee[] {
    return [
      {
        id: 'ceo',
        name: 'John Smith',
        title: 'CEO',
        avatar: 'JS',
        departmentId: 'executive',
        departmentName: 'Executive',
        subordinates: ['ops', 'sales', 'hr'],
      },
      {
        id: 'ops',
        name: 'Sarah Chen',
        title: 'VP Operations',
        avatar: 'SC',
        departmentId: 'operations',
        departmentName: 'Operations',
        subordinates: ['ops1', 'ops2'],
      },
      {
        id: 'sales',
        name: 'Michael Ross',
        title: 'VP Sales',
        avatar: 'MR',
        departmentId: 'sales',
        departmentName: 'Sales',
        subordinates: ['sales1', 'sales2'],
      },
      {
        id: 'hr',
        name: 'Emma Wilson',
        title: 'VP Human Resources',
        avatar: 'EW',
        departmentId: 'hr',
        departmentName: 'HR',
        subordinates: ['hr1', 'hr2'],
      },
      {
        id: 'ops1',
        name: 'James Kim',
        title: 'Operations Manager',
        avatar: 'JK',
        departmentId: 'operations',
        departmentName: 'Operations',
      },
      {
        id: 'ops2',
        name: 'Lisa Wong',
        title: 'Operations Manager',
        avatar: 'LW',
        departmentId: 'operations',
        departmentName: 'Operations',
      },
      {
        id: 'sales1',
        name: 'David Kumar',
        title: 'Sales Manager',
        avatar: 'DK',
        departmentId: 'sales',
        departmentName: 'Sales',
      },
      {
        id: 'sales2',
        name: 'Maria Garcia',
        title: 'Sales Manager',
        avatar: 'MG',
        departmentId: 'sales',
        departmentName: 'Sales',
      },
      {
        id: 'hr1',
        name: 'Alex Thompson',
        title: 'HR Manager',
        avatar: 'AT',
        departmentId: 'hr',
        departmentName: 'HR',
      },
      {
        id: 'hr2',
        name: 'Sophie Anderson',
        title: 'Recruiter',
        avatar: 'SA',
        departmentId: 'hr',
        departmentName: 'HR',
      },
    ];
  }

  private getMockKpiDefinitions(): KpiDefinition[] {
    return [
      {
        id: '1',
        name: 'Sales Target Achievement',
        category: 'Sales',
        target: 100,
        weight: 30,
        unit: '%',
        frequency: 'Monthly',
      },
      {
        id: '2',
        name: 'Customer Satisfaction Score',
        category: 'Customer Service',
        target: 4.5,
        weight: 25,
        unit: '/5',
        frequency: 'Quarterly',
      },
      {
        id: '3',
        name: 'Project Delivery On-Time',
        category: 'Operations',
        target: 95,
        weight: 20,
        unit: '%',
        frequency: 'Monthly',
      },
      {
        id: '4',
        name: 'Quality Assurance Pass Rate',
        category: 'Quality',
        target: 98,
        weight: 15,
        unit: '%',
        frequency: 'Monthly',
      },
      {
        id: '5',
        name: 'Team Collaboration Score',
        category: 'Teamwork',
        target: 4.0,
        weight: 10,
        unit: '/5',
        frequency: 'Quarterly',
      },
    ];
  }

  private getMockPerformanceReviews(): PerformanceReviewRecord[] {
    return [
      {
        id: '1',
        employeeId: 'E001',
        employeeName: 'Sarah Chen',
        department: 'Operations',
        reviewPeriod: 'Q1 2025',
        status: 'completed',
        overallScore: 92,
        salaryImpact: 5,
        bonusImpact: 8000,
      },
      {
        id: '2',
        employeeId: 'E002',
        employeeName: 'Michael Ross',
        department: 'Sales',
        reviewPeriod: 'Q1 2025',
        status: 'completed',
        overallScore: 88,
        salaryImpact: 4,
        bonusImpact: 6500,
      },
      {
        id: '3',
        employeeId: 'E003',
        employeeName: 'Emma Wilson',
        department: 'Customer Service',
        reviewPeriod: 'Q1 2025',
        status: 'pending',
        overallScore: 0,
        salaryImpact: 0,
        bonusImpact: 0,
      },
      {
        id: '4',
        employeeId: 'E004',
        employeeName: 'James Kim',
        department: 'Operations',
        reviewPeriod: 'Q1 2025',
        status: 'draft',
        overallScore: 0,
        salaryImpact: 0,
        bonusImpact: 0,
      },
    ];
  }

  private getMockReviewTemplates(): ReviewTemplate[] {
    return [
      {
        id: 'tpl-1',
        name: 'Quarterly Performance Review',
        kpiCount: 6,
        usageCount: 42,
        description: 'Standard template with 6 KPIs and competency assessment',
      },
      {
        id: 'tpl-2',
        name: 'Annual Performance Review',
        kpiCount: 8,
        usageCount: 31,
        description: 'Annual review with strategic KPI coverage and growth goals',
      },
      {
        id: 'tpl-3',
        name: 'Probation Review',
        kpiCount: 4,
        usageCount: 18,
        description: 'Probation assessment focusing on onboarding milestones',
      },
      {
        id: 'tpl-4',
        name: '360° Feedback Review',
        kpiCount: 5,
        usageCount: 27,
        description: 'Peer and manager feedback with balanced scorecard KPIs',
      },
      {
        id: 'tpl-5',
        name: 'Project-Based Review',
        kpiCount: 3,
        usageCount: 12,
        description: 'Project completion and delivery effectiveness review',
      },
      {
        id: 'tpl-6',
        name: 'Self-Assessment Template',
        kpiCount: 4,
        usageCount: 21,
        description: 'Self-evaluation template aligned with team objectives',
      },
    ];
  }

  private getMockOnboardingProcesses(): OnboardingProcess[] {
    return [
      {
        id: '1',
        employeeName: 'Alex Johnson',
        employeeId: 'E105',
        department: 'Sales',
        position: 'Sales Manager',
        startDate: '2025-02-01',
        status: 'in-progress',
        progress: 65,
        tasksCompleted: 13,
        totalTasks: 20,
      },
      {
        id: '2',
        employeeName: 'Maria Garcia',
        employeeId: 'E106',
        department: 'IT',
        position: 'Software Engineer',
        startDate: '2025-02-05',
        status: 'in-progress',
        progress: 40,
        tasksCompleted: 8,
        totalTasks: 20,
      },
      {
        id: '3',
        employeeName: 'David Lee',
        employeeId: 'E107',
        department: 'Operations',
        position: 'Operations Coordinator',
        startDate: '2025-02-10',
        status: 'not-started',
        progress: 0,
        tasksCompleted: 0,
        totalTasks: 18,
      },
      {
        id: '4',
        employeeName: 'Sophie Turner',
        employeeId: 'E108',
        department: 'Marketing',
        position: 'Marketing Specialist',
        startDate: '2025-01-15',
        status: 'completed',
        progress: 100,
        tasksCompleted: 20,
        totalTasks: 20,
      },
    ];
  }

  private getMockOffboardingProcesses(): OffboardingProcess[] {
    return [
      {
        id: '1',
        employeeName: 'Robert Brown',
        employeeId: 'E042',
        department: 'Customer Service',
        lastDay: '2025-02-15',
        reason: 'Resignation',
        status: 'in-progress',
        progress: 70,
      },
      {
        id: '2',
        employeeName: 'Jennifer White',
        employeeId: 'E058',
        department: 'Sales',
        lastDay: '2025-02-28',
        reason: 'Termination',
        status: 'in-progress',
        progress: 45,
      },
      {
        id: '3',
        employeeName: 'Thomas Anderson',
        employeeId: 'E031',
        department: 'IT',
        lastDay: '2025-01-31',
        reason: 'Resignation',
        status: 'completed',
        progress: 100,
      },
    ];
  }

  private getMockOnboardingTasks(): ProcessTask[] {
    return [
      {
        id: '1',
        title: 'Send Welcome Email',
        description: 'Send welcome package with company info',
        assignedTo: 'HR Team',
        dueDate: 'Day -3',
        status: 'completed',
        category: 'Pre-boarding',
      },
      {
        id: '2',
        title: 'Prepare Workstation',
        description: 'Setup desk, computer, and equipment',
        assignedTo: 'IT Team',
        dueDate: 'Day -1',
        status: 'completed',
        category: 'Pre-boarding',
      },
      {
        id: '3',
        title: 'Create Email Account',
        description: 'Setup corporate email and credentials',
        assignedTo: 'IT Team',
        dueDate: 'Day -1',
        status: 'completed',
        category: 'Pre-boarding',
      },
      {
        id: '4',
        title: 'Office Tour',
        description: 'Show office facilities and introduce to team',
        assignedTo: 'Manager',
        dueDate: 'Day 1',
        status: 'in-progress',
        category: 'Day 1',
      },
      {
        id: '5',
        title: 'Complete HR Paperwork',
        description: 'Fill out tax forms, contracts, and policies',
        assignedTo: 'Employee',
        dueDate: 'Day 1',
        status: 'in-progress',
        category: 'Day 1',
      },
      {
        id: '6',
        title: 'Assign Mentor/Buddy',
        description: 'Pair with experienced team member',
        assignedTo: 'Manager',
        dueDate: 'Day 1',
        status: 'pending',
        category: 'Day 1',
      },
      {
        id: '7',
        title: 'IT Security Training',
        description: 'Complete cybersecurity awareness training',
        assignedTo: 'Employee',
        dueDate: 'Week 1',
        status: 'pending',
        category: 'Week 1',
      },
      {
        id: '8',
        title: 'System Access Setup',
        description: 'Grant access to required systems and tools',
        assignedTo: 'IT Team',
        dueDate: 'Week 1',
        status: 'pending',
        category: 'Week 1',
      },
      {
        id: '9',
        title: 'Department Training',
        description: 'Complete role-specific training modules',
        assignedTo: 'Employee',
        dueDate: 'Week 2',
        status: 'pending',
        category: 'First Month',
      },
      {
        id: '10',
        title: '30-Day Check-in',
        description: 'Review progress and address concerns',
        assignedTo: 'Manager',
        dueDate: 'Day 30',
        status: 'pending',
        category: 'First Month',
      },
    ];
  }

  private getMockOffboardingTasks(): ProcessTask[] {
    return [
      {
        id: '1',
        title: 'Exit Interview',
        description: 'Conduct exit interview to gather feedback',
        assignedTo: 'HR Manager',
        dueDate: 'Day -5',
        status: 'in-progress',
        category: 'Pre-exit',
      },
      {
        id: '2',
        title: 'Knowledge Transfer',
        description: 'Document processes and handover tasks',
        assignedTo: 'Employee',
        dueDate: 'Day -7',
        status: 'in-progress',
        category: 'Pre-exit',
      },
      {
        id: '3',
        title: 'Revoke System Access',
        description: 'Disable all system accounts and credentials',
        assignedTo: 'IT Team',
        dueDate: 'Last Day',
        status: 'pending',
        category: 'Last Day',
      },
      {
        id: '4',
        title: 'Collect Company Assets',
        description: 'Return laptop, badge, keys, and equipment',
        assignedTo: 'IT/Admin',
        dueDate: 'Last Day',
        status: 'pending',
        category: 'Last Day',
      },
      {
        id: '5',
        title: 'Final Payroll Processing',
        description: 'Process final salary and benefits',
        assignedTo: 'Payroll Team',
        dueDate: 'Last Day',
        status: 'pending',
        category: 'Last Day',
      },
      {
        id: '6',
        title: 'Clear Outstanding Balances',
        description: 'Settle any advances or dues',
        assignedTo: 'Finance',
        dueDate: 'Last Day',
        status: 'pending',
        category: 'Post-exit',
      },
      {
        id: '7',
        title: 'Update HR Records',
        description: 'Update employee status in HRIS',
        assignedTo: 'HR Team',
        dueDate: 'Day +1',
        status: 'pending',
        category: 'Post-exit',
      },
      {
        id: '8',
        title: 'Issue Service Certificate',
        description: 'Provide experience/relieving letter',
        assignedTo: 'HR Team',
        dueDate: 'Day +3',
        status: 'pending',
        category: 'Post-exit',
      },
    ];
  }

  private getMockProcessTemplates(): ProcessTemplate[] {
    return [
      {
        id: 'onb-1',
        name: 'General Employee Onboarding',
        type: 'onboarding',
        taskCount: 18,
        timelineDays: 25,
      },
      {
        id: 'onb-2',
        name: 'Sales Team Onboarding',
        type: 'onboarding',
        taskCount: 20,
        timelineDays: 28,
      },
      {
        id: 'onb-3',
        name: 'IT Department Onboarding',
        type: 'onboarding',
        taskCount: 22,
        timelineDays: 30,
      },
      {
        id: 'onb-4',
        name: 'Management Onboarding',
        type: 'onboarding',
        taskCount: 24,
        timelineDays: 35,
      },
      {
        id: 'onb-5',
        name: 'Remote Employee Onboarding',
        type: 'onboarding',
        taskCount: 16,
        timelineDays: 20,
      },
      {
        id: 'onb-6',
        name: 'Intern Onboarding',
        type: 'onboarding',
        taskCount: 12,
        timelineDays: 14,
      },
      {
        id: 'off-1',
        name: 'Standard Resignation',
        type: 'offboarding',
        taskCount: 10,
        timelineDays: 14,
      },
      {
        id: 'off-2',
        name: 'Termination Process',
        type: 'offboarding',
        taskCount: 12,
        timelineDays: 10,
      },
      {
        id: 'off-3',
        name: 'Retirement Process',
        type: 'offboarding',
        taskCount: 9,
        timelineDays: 21,
      },
      {
        id: 'off-4',
        name: 'Contract End',
        type: 'offboarding',
        taskCount: 8,
        timelineDays: 12,
      },
      {
        id: 'off-5',
        name: 'Voluntary Exit',
        type: 'offboarding',
        taskCount: 9,
        timelineDays: 15,
      },
      {
        id: 'off-6',
        name: 'Emergency Separation',
        type: 'offboarding',
        taskCount: 7,
        timelineDays: 7,
      },
    ];
  }
}
