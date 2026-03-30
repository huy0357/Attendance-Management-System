export interface ProfileRecord {
  accountId: number;
  employeeId: number;
  employeeCode: string | null;
  username: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  dob: string | null;
  roleId: number | null;
  roleCode: string | null;
  isActive: boolean;
  status: string | null;
  departmentId: number | null;
  positionId: number | null;
  managerId: number | null;
  hireDate: string | null;
  terminatedDate: string | null;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  message?: string;
  avatarLabel: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  email?: string;
}
