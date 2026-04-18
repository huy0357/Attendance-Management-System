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

import { employeeApi } from '../api/hrm.api';

// No Real Contract API exists in Backend natively yet, so we map Employee records to Contract interfaces 
// so the UI can represent Real Data.
export const contractsApi = {
  getContracts: async (): Promise<ContractRecord[]> => {
    // 1. Dùng API lấy toàn bộ nhân viên thật (thay cho mock data)
    const employees = await employeeApi.getAll();
    
    // 2. Map sang định dạng Contract
    return employees.map(emp => ({
      id: `CT-${emp.employeeId}`,
      employeeId: `EMP-${emp.employeeId}`,
      employeeName: emp.fullName || 'Unknown',
      employeeAvatar: (emp.fullName || 'U').split(' ').map(p => p[0]).join('').substring(0,2).toUpperCase(),
      department: emp.departmentId ? `Dept ${emp.departmentId}` : 'Unassigned',
      position: emp.positionId ? `Pos ${emp.positionId}` : 'Unassigned',
      contractType: 'permanent',
      startDate: emp.hireDate || new Date().toISOString().split('T')[0],
      endDate: emp.terminatedDate || undefined,
      baseSalary: 0,
      currency: 'USD',
      benefits: [],
      status: emp.status === 'active' ? 'active' : 'terminated',
      notes: 'Mapped from real Employee record'
    }));
  },
  createContract: async (contract: ContractRecord): Promise<ContractRecord> => {
    // Falls back to employee API creation if needed in real system
    // Currently simulates creating contract
    return new Promise(resolve => setTimeout(() => resolve(contract), 500));
  },
  updateContract: async (contract: ContractRecord): Promise<ContractRecord> => {
    return new Promise(resolve => setTimeout(() => resolve(contract), 500));
  },
  deleteContract: async (_contractId: string): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, 500));
  }
};
