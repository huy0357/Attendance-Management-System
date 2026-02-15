/**
 * FE interfaces matching BE Account DTOs.
 * BE entity role enum: admin | hr | manager | employee (lowercase).
 */

export type AccountRole = 'admin' | 'hr' | 'manager' | 'employee';

/** Matches BE AccountDto (GET /api/accounts, GET /api/accounts/{id}, page, search results). */
export interface AccountDto {
    accountId: number;
    employeeId: number;
    username: string;
    role: AccountRole;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

/** Matches BE AccountResponse (POST /api/accounts response). */
export interface AccountResponse {
    accountId: number;
    employeeId: number;
    username: string;
    role: AccountRole;
    isActive: boolean;
    createdAt: string | null;
}

/** Matches BE CreateAccountRequest (POST /api/accounts body). */
export interface CreateAccountRequest {
    employeeId: number;
    username: string;
    password: string;
    role: AccountRole;
    isActive?: boolean;
}

/** Matches BE UpdateAccountRequest (PUT /api/accounts/{id} body). */
export interface UpdateAccountRequest {
    username?: string;
    role?: AccountRole;
    isActive?: boolean;
}
