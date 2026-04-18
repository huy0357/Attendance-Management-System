export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'attendance' | 'payroll' | 'employee' | 'custom';
  lastRun?: string;
  icon: string;
}

const MOCK_REPORTS: ReportTemplate[] = [
  {
    id: 'RPT-001',
    name: 'Monthly Attendance Summary',
    description: 'Aggregated view of employee attendance, including late and early leaves.',
    type: 'attendance',
    lastRun: '2026-03-31T08:00:00Z',
    icon: 'calendar'
  },
  {
    id: 'RPT-002',
    name: 'Payroll Expense Report',
    description: 'Detailed breakdown of base salary, overtime, and deductions by period.',
    type: 'payroll',
    lastRun: '2026-03-31T17:30:00Z',
    icon: 'dollar'
  },
  {
    id: 'RPT-003',
    name: 'Employee Demographics',
    description: 'Statistical overview of employee composition by department, role, and gender.',
    type: 'employee',
    icon: 'users'
  },
  {
    id: 'RPT-004',
    name: 'Custom HR Audit Data',
    description: 'Raw extract for external HR audit system integrations.',
    type: 'custom',
    icon: 'database'
  }
];

export const reportsApi = {
  getReportTemplates: async (): Promise<ReportTemplate[]> => {
    return new Promise(resolve => setTimeout(() => resolve([...MOCK_REPORTS]), 700));
  },
  generateReport: async (id: string): Promise<{blob: Blob, name: string}> => {
    return new Promise(resolve => {
      setTimeout(() => {
        // Create an empty dummy blob
        const blob = new Blob(['Mock report content...'], { type: 'text/csv' });
        resolve({ blob, name: `report_${id}_${new Date().getTime()}.csv` });
      }, 1500);
    });
  }
};
