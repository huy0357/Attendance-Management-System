export interface ProfileDto {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  position: string | null;
  departmentId: number | null;
  departmentName: string | null;
  avatar: string | null;
  avatarUrl?: string | null;
  avatarLabel?: string;
  hireDate: string | null;
  isActive: boolean;
  username?: string;
  roleCode?: string;
  positionId?: number;
  managerId?: number;
  status?: string;
  dob?: string;
  gender?: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  position?: string;
}
