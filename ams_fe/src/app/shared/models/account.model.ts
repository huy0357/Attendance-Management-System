export type AccountRoleCode = 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';

export interface AccountDto {
  accountId: number;
  employeeId: number;
  username: string;
  roleId: number | null;
  roleCode: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AccountResponse {
  accountId: number;
  employeeId: number;
  username: string;
  roleId: number | null;
  roleCode: string | null;
  isActive: boolean;
  createdAt: string | null;
}

export interface CreateAccountRequest {
  employeeId: number;
  username: string;
  password: string;
  roleId: number;
  isActive?: boolean;
}

export interface UpdateAccountRequest {
  username?: string;
  roleId?: number;
  isActive?: boolean;
}

export interface RoleResponse {
  roleId: number;
  roleCode: string;
  roleName: string;
  description: string;
}
