export interface AccountDto {
  accountId: number;
  employeeId: number;
  username: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
  roleId: number | null;
  roleCode: string | null;
  roleName: string | null;
}

export interface AccountResponse {
  accountId: number;
  username: string;
  employeeId: number;
  roleId: number | null;
  roleCode: string | null;
  isActive: boolean;
}

export interface CreateAccountRequest {
  username: string;
  password: string;
  employeeId: number;
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
