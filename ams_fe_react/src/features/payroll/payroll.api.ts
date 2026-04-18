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

const MOCK_PAYROLL: PayrollRecord[] = [
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
];

export const payrollApi = {
  getPayrollRecords: async (): Promise<PayrollRecord[]> => {
    return new Promise(resolve => setTimeout(() => resolve([...MOCK_PAYROLL]), 600));
  }
};
