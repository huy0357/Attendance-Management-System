import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AccountDto,
  AccountResponse,
  CreateAccountRequest,
  RoleResponse,
  UpdateAccountRequest,
} from '../../shared/models/account.model';
import { PageResponse } from '../../shared/models/page-response.model';

export type AccountStatus = 'active' | 'inactive';

export interface UserAccountRecord {
  id: string;
  employeeId: number;
  username: string;
  role: string;
  status: AccountStatus;
  lastLogin: string;
  createdDate: string;
  roleId: number | null;
  roleCode: string | null;
}

export interface AccountRoleDefinition {
  id: number;
  name: string;
  code: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly accountsUrl = `${environment.apiBaseUrl}/accounts`;
  private readonly rolesUrl = `${environment.apiBaseUrl}/roles`;

  constructor(private http: HttpClient) { }

  getUserAccounts(): Observable<UserAccountRecord[]> {
    return this.http.get<AccountDto[]>(this.accountsUrl).pipe(
      map((accounts) => accounts.map((account) => this.mapAccountDtoToRecord(account))),
    );
  }

  getAccountById(id: number): Observable<AccountDto> {
    return this.http.get<AccountDto>(`${this.accountsUrl}/${id}`);
  }

  getAccounts(): Observable<AccountDto[]> {
    return this.http.get<AccountDto[]>(this.accountsUrl);
  }

  createAccount(request: CreateAccountRequest): Observable<AccountResponse> {
    return this.http.post<AccountResponse>(this.accountsUrl, request);
  }

  updateAccount(id: number, request: UpdateAccountRequest): Observable<AccountDto> {
    return this.http.put<AccountDto>(`${this.accountsUrl}/${id}`, request);
  }

  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.accountsUrl}/${id}`);
  }

  getAccountsPage(
    page = 1,
    size = 10,
    sortBy = 'accountId',
    sortDir = 'desc',
    isActive?: boolean,
  ): Observable<PageResponse<AccountDto>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }

    return this.http.get<PageResponse<AccountDto>>(`${this.accountsUrl}/page`, { params });
  }

  searchAccounts(
    username: string,
    page = 1,
    size = 10,
    sortBy = 'accountId',
    sortDir = 'desc',
  ): Observable<PageResponse<AccountDto>> {
    const params = new HttpParams()
      .set('username', username)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<PageResponse<AccountDto>>(`${this.accountsUrl}/search`, { params });
  }

  getAccountRoles(): Observable<AccountRoleDefinition[]> {
    return this.http.get<RoleResponse[]>(this.rolesUrl).pipe(
      map((roles) =>
        roles.map((role) => ({
          id: role.roleId,
          name: role.roleName,
          code: role.roleCode,
          description: role.description,
        })),
      ),
    );
  }

  private mapAccountDtoToRecord(account: AccountDto): UserAccountRecord {
    const roleCode = (account.roleCode ?? '').toUpperCase();
    return {
      id: String(account.accountId),
      employeeId: account.employeeId,
      username: account.username,
      role: roleCode.toLowerCase(),
      status: account.isActive ? 'active' : 'inactive',
      lastLogin: account.lastLoginAt ?? 'Never',
      createdDate: account.createdAt ? account.createdAt.split('T')[0] : '',
      roleId: account.roleId ?? null,
      roleCode: account.roleCode ?? null,
    };
  }
}
