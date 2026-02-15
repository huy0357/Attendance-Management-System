import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PayrollEmployee {
  id: string;
  name: string;
  avatar: string;
  department: string;
  baseSalary: number;
  overtime: number;
  deductions: number;
  total: number;
  lastMonth: number;
  status: 'pending' | 'approved' | 'sent';
}

export interface FormulaNode {
  id: string;
  type: 'variable' | 'operator' | 'function';
  label: string;
  value?: string;
  x: number;
  y: number;
  connections?: string[];
}

export interface FormulaIngredient {
  id: string;
  label: string;
  icon?: string;
  description?: string;
}

export interface FormulaIngredientGroup {
  variables: FormulaIngredient[];
  operators: FormulaIngredient[];
  functions: FormulaIngredient[];
}

export interface SimulationEmployee {
  id: string;
  name: string;
  baseSalary: number;
  overtimeHours: number;
  hourlyRate: number;
}

export interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  payDate: string;
  status: 'draft' | 'calculated' | 'approved' | 'locked';
  lockDate?: string;
  lockedBy?: string;
  totalEmployees: number;
  totalAmount: number;
  calculatedDate?: string;
  approvedDate?: string;
  notes?: string;
}

export interface LockHistory {
  id: string;
  periodId: string;
  action: 'locked' | 'unlocked';
  performedBy: string;
  timestamp: string;
  reason: string;
}

export interface TaxBracket {
  id: string;
  name: string;
  minIncome: number;
  maxIncome: number | null;
  rate: number;
  fixedAmount: number;
  enabled: boolean;
}

export interface Deduction {
  id: string;
  name: string;
  type: 'fixed' | 'percentage';
  value: number;
  category: 'federal' | 'state' | 'local' | 'benefits';
  mandatory: boolean;
  enabled: boolean;
}

export interface TaxCalculationExample {
  grossPay: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  otherDeductions: number;
  netPay: number;
}

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private readonly baseUrl = `${environment.apiBaseUrl}/payroll`;

  constructor(private http: HttpClient) {}

  // TODO (NO API YET): Replace mock data with real endpoints under /api/payroll.
  getPayrollEmployees(): Observable<PayrollEmployee[]> {
    return of([
      {
        id: '1',
        name: 'Sarah Chen',
        avatar: 'SC',
        department: 'Operations',
        baseSalary: 5000,
        overtime: 400,
        deductions: 200,
        total: 5200,
        lastMonth: 5000,
        status: 'approved',
      },
      {
        id: '2',
        name: 'Michael Ross',
        avatar: 'MR',
        department: 'Operations',
        baseSalary: 4500,
        overtime: 540,
        deductions: 150,
        total: 4890,
        lastMonth: 4500,
        status: 'approved',
      },
      {
        id: '3',
        name: 'Emma Wilson',
        avatar: 'EW',
        department: 'Customer Service',
        baseSalary: 5500,
        overtime: 275,
        deductions: 180,
        total: 5595,
        lastMonth: 5400,
        status: 'pending',
      },
      {
        id: '4',
        name: 'James Kim',
        avatar: 'JK',
        department: 'Sales',
        baseSalary: 6000,
        overtime: 320,
        deductions: 250,
        total: 6070,
        lastMonth: 5800,
        status: 'approved',
      },
      {
        id: '5',
        name: 'Lisa Wong',
        avatar: 'LW',
        department: 'Sales',
        baseSalary: 5800,
        overtime: 450,
        deductions: 220,
        total: 6030,
        lastMonth: 5200,
        status: 'pending',
      },
    ]);
  }

  getFormulaNodes(): Observable<FormulaNode[]> {
    return of([
      { id: '1', type: 'variable', label: 'Base Salary', value: 'baseSalary', x: 50, y: 100 },
      { id: '2', type: 'variable', label: 'Overtime Hours', value: 'overtimeHours', x: 50, y: 200 },
      { id: '3', type: 'operator', label: '&times;', value: 'multiply', x: 200, y: 200, connections: ['2', '4'] },
      { id: '4', type: 'variable', label: 'Hourly Rate', value: 'hourlyRate', x: 50, y: 300 },
      { id: '5', type: 'operator', label: '+', value: 'add', x: 350, y: 150, connections: ['1', '3'] },
      { id: '6', type: 'function', label: 'TOTAL', value: 'total', x: 500, y: 150, connections: ['5'] },
    ]);
  }

  getFormulaIngredients(): Observable<FormulaIngredientGroup> {
    return of({
      variables: [
        { id: 'baseSalary', label: 'Base Salary', icon: 'dollar-sign' },
        { id: 'overtimeHours', label: 'Overtime Hours', icon: 'clock' },
        { id: 'hourlyRate', label: 'Hourly Rate', icon: 'dollar-sign' },
        { id: 'daysPresent', label: 'Days Present', icon: 'users' },
        { id: 'deductions', label: 'Deductions', icon: 'dollar-sign' },
      ],
      operators: [
        { id: 'add', label: '+', description: 'Addition' },
        { id: 'subtract', label: '&minus;', description: 'Subtraction' },
        { id: 'multiply', label: '&times;', description: 'Multiplication' },
        { id: 'divide', label: '&divide;', description: 'Division' },
      ],
      functions: [
        { id: 'if', label: 'IF', description: 'Conditional' },
        { id: 'round', label: 'ROUND', description: 'Round number' },
        { id: 'max', label: 'MAX', description: 'Maximum value' },
        { id: 'min', label: 'MIN', description: 'Minimum value' },
      ],
    });
  }

  getSimulationEmployees(): Observable<SimulationEmployee[]> {
    return of([
      { id: 'sarah-chen', name: 'Sarah Chen', baseSalary: 5000, overtimeHours: 8, hourlyRate: 50 },
      { id: 'michael-ross', name: 'Michael Ross', baseSalary: 4500, overtimeHours: 12, hourlyRate: 45 },
      { id: 'emma-wilson', name: 'Emma Wilson', baseSalary: 5500, overtimeHours: 5, hourlyRate: 55 },
    ]);
  }

  getPayrollPeriods(): Observable<PayrollPeriod[]> {
    return of([
      {
        id: 'PP-2026-01',
        name: 'January 2026',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        payDate: '2026-02-05',
        status: 'locked',
        lockDate: '2026-02-01',
        lockedBy: 'Admin User',
        totalEmployees: 247,
        totalAmount: 1245000,
        calculatedDate: '2026-01-31',
        approvedDate: '2026-02-01',
        notes: 'Regular monthly payroll - all approved',
      },
      {
        id: 'PP-2025-12',
        name: 'December 2025',
        startDate: '2025-12-01',
        endDate: '2025-12-31',
        payDate: '2026-01-05',
        status: 'locked',
        lockDate: '2026-01-02',
        lockedBy: 'Admin User',
        totalEmployees: 242,
        totalAmount: 1350000,
        calculatedDate: '2025-12-31',
        approvedDate: '2026-01-02',
        notes: 'Year-end bonuses included',
      },
      {
        id: 'PP-2026-02',
        name: 'February 2026',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        payDate: '2026-03-05',
        status: 'approved',
        totalEmployees: 247,
        totalAmount: 1258000,
        calculatedDate: '2026-02-20',
        approvedDate: '2026-02-21',
        notes: 'Pending final lock',
      },
      {
        id: 'PP-2026-03',
        name: 'March 2026',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        payDate: '2026-04-05',
        status: 'calculated',
        totalEmployees: 247,
        totalAmount: 1240000,
        calculatedDate: '2026-03-15',
        notes: 'Awaiting final approval',
      },
      {
        id: 'PP-2026-04',
        name: 'April 2026',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        payDate: '2026-05-05',
        status: 'draft',
        totalEmployees: 247,
        totalAmount: 0,
        notes: 'Not yet calculated',
      },
    ]);
  }

  getLockHistory(): Observable<LockHistory[]> {
    return of([
      {
        id: 'LH-001',
        periodId: 'PP-2026-01',
        action: 'locked',
        performedBy: 'Admin User',
        timestamp: '2026-02-01 10:30:00',
        reason: 'Payroll approved and finalized',
      },
      {
        id: 'LH-002',
        periodId: 'PP-2025-12',
        action: 'locked',
        performedBy: 'Admin User',
        timestamp: '2026-01-02 14:20:00',
        reason: 'Year-end payroll finalized',
      },
      {
        id: 'LH-003',
        periodId: 'PP-2025-11',
        action: 'unlocked',
        performedBy: 'Admin User',
        timestamp: '2025-12-10 09:15:00',
        reason: 'Correction needed for overtime calculations',
      },
      {
        id: 'LH-004',
        periodId: 'PP-2025-11',
        action: 'locked',
        performedBy: 'Admin User',
        timestamp: '2025-12-10 11:45:00',
        reason: 'Re-locked after corrections',
      },
    ]);
  }

  getTaxBrackets(): Observable<TaxBracket[]> {
    return of([
      { id: 'TB-001', name: '10% Bracket', minIncome: 0, maxIncome: 10275, rate: 10.0, fixedAmount: 0, enabled: true },
      { id: 'TB-002', name: '12% Bracket', minIncome: 10276, maxIncome: 41775, rate: 12.0, fixedAmount: 1027.5, enabled: true },
      { id: 'TB-003', name: '22% Bracket', minIncome: 41776, maxIncome: 89075, rate: 22.0, fixedAmount: 4807.5, enabled: true },
      { id: 'TB-004', name: '24% Bracket', minIncome: 89076, maxIncome: 170050, rate: 24.0, fixedAmount: 15213.5, enabled: true },
      { id: 'TB-005', name: '32% Bracket', minIncome: 170051, maxIncome: 215950, rate: 32.0, fixedAmount: 34647.5, enabled: true },
      { id: 'TB-006', name: '35% Bracket', minIncome: 215951, maxIncome: 539900, rate: 35.0, fixedAmount: 49335.5, enabled: true },
      { id: 'TB-007', name: '37% Bracket', minIncome: 539901, maxIncome: null, rate: 37.0, fixedAmount: 162718.0, enabled: true },
    ]);
  }

  getDeductions(): Observable<Deduction[]> {
    return of([
      {
        id: 'DED-001',
        name: 'Social Security',
        type: 'percentage',
        value: 6.2,
        category: 'federal',
        mandatory: true,
        enabled: true,
      },
      {
        id: 'DED-002',
        name: 'Medicare',
        type: 'percentage',
        value: 1.45,
        category: 'federal',
        mandatory: true,
        enabled: true,
      },
      {
        id: 'DED-003',
        name: 'State Income Tax',
        type: 'percentage',
        value: 5.0,
        category: 'state',
        mandatory: true,
        enabled: true,
      },
      {
        id: 'DED-004',
        name: 'Health Insurance',
        type: 'fixed',
        value: 250.0,
        category: 'benefits',
        mandatory: false,
        enabled: true,
      },
      {
        id: 'DED-005',
        name: '401(k) Contribution',
        type: 'percentage',
        value: 5.0,
        category: 'benefits',
        mandatory: false,
        enabled: true,
      },
      {
        id: 'DED-006',
        name: 'Local City Tax',
        type: 'percentage',
        value: 1.5,
        category: 'local',
        mandatory: true,
        enabled: true,
      },
    ]);
  }
}
