export interface EmployeeDto {
  employeeId: number;
  employeeCode: string | null;
  fullName: string | null;
  dob: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  departmentId: number | null;
  positionId: number | null;
  managerId: number | null;
  hireDate: string | null;
  terminatedDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface EmployeeRequest {
  employeeCode?: string | null;
  fullName?: string | null;
  dob?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  departmentId?: number | null;
  positionId?: number | null;
  managerId?: number | null;
  hireDate?: string | null;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface EmployeePageQuery {
  page: number;
  size: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}
