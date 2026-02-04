export interface User {
  username: string;
  role: UserRole;
}

/** Khớp với BE Account.Role: admin, hr, manager, employee */
export enum UserRole {
  ADMIN = 'admin',
  HR = 'hr',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  username: string;
  role: string;
}
