import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
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

export type AuditLogAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'approve'
  | 'reject'
  | 'lock'
  | 'unlock';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditLogAction;
  module: string;
  recordId: string;
  ipAddress: string;
  userAgent: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  notes?: string;
}

export interface BackupRecord {
  name: string;
  date: string;
  time: string;
  size: string;
  type: 'full' | 'incremental' | 'manual' | 'differential' | 'partial';
  recordCount: number;
  status: 'completed' | 'in-progress' | 'failed';
  duration: string;
}

export interface BackupScheduleConfig {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  time: string;
  retention: number;
  type: 'full' | 'incremental' | 'differential';
  compression: boolean;
  encryption: boolean;
}

export type DeviceType = 'face-recognition' | 'fingerprint' | 'card-reader' | 'mobile-app';
export type DeviceStatus = 'online' | 'offline' | 'maintenance';

export interface LocationRecord {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  timezone: string;
  enabled: boolean;
  devices: number;
}

export interface DeviceRecord {
  id: string;
  name: string;
  deviceType: DeviceType;
  locationId: string;
  locationName: string;
  ipAddress: string;
  macAddress: string;
  status: DeviceStatus;
  lastSeen: string;
  firmware: string;
  enabled: boolean;
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

  getAuditLogs(): Observable<AuditLog[]> {
    return of([
      {
        id: 'LOG-001',
        timestamp: '2026-01-22 09:15:23',
        userId: 'U001',
        userName: 'Admin User',
        userRole: 'ADMIN',
        action: 'create',
        module: 'Employees',
        recordId: 'EMP-105',
        ipAddress: '192.168.1.10',
        userAgent: 'Chrome on Windows',
        afterValue: { employeeName: 'Alex Johnson' },
        notes: 'Employee record created successfully.',
      },
      {
        id: 'LOG-002',
        timestamp: '2026-01-22 11:45:10',
        userId: 'U002',
        userName: 'Emma Wilson',
        userRole: 'HR',
        action: 'update',
        module: 'Contracts',
        recordId: 'CT-004',
        ipAddress: '192.168.1.22',
        userAgent: 'Edge on Windows',
        beforeValue: { status: 'pending' },
        afterValue: { status: 'active' },
      },
      {
        id: 'LOG-003',
        timestamp: '2026-01-21 16:03:02',
        userId: 'U003',
        userName: 'Sarah Chen',
        userRole: 'MANAGER',
        action: 'approve',
        module: 'OT Requests',
        recordId: 'REQ-033',
        ipAddress: '192.168.1.35',
        userAgent: 'Chrome on macOS',
        notes: 'Approved 3 hours OT request.',
      },
    ]);
  }

  getBackupList(): Observable<BackupRecord[]> {
    return of([
      {
        name: 'Full_Backup_2026_01_22',
        date: '2026-01-22',
        time: '02:00 AM',
        size: '2.4 GB',
        type: 'full',
        recordCount: 152340,
        status: 'completed',
        duration: '14 min',
      },
      {
        name: 'Incremental_2026_01_21',
        date: '2026-01-21',
        time: '02:00 AM',
        size: '420 MB',
        type: 'incremental',
        recordCount: 12840,
        status: 'completed',
        duration: '4 min',
      },
      {
        name: 'Manual_PreRelease',
        date: '2026-01-20',
        time: '05:30 PM',
        size: '2.5 GB',
        type: 'manual',
        recordCount: 151200,
        status: 'completed',
        duration: '15 min',
      },
    ]);
  }

  getBackupSchedule(): Observable<BackupScheduleConfig> {
    return of({
      enabled: true,
      frequency: 'daily',
      time: '02:00',
      retention: 30,
      type: 'full',
      compression: true,
      encryption: true,
    });
  }

  getLocations(): Observable<LocationRecord[]> {
    return of([
      {
        id: 'LOC-001',
        name: 'Headquarters',
        address: '123 Market Street, San Francisco, CA',
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 100,
        timezone: 'America/Los_Angeles',
        enabled: true,
        devices: 2,
      },
      {
        id: 'LOC-002',
        name: 'Branch Office',
        address: '500 Main Street, Austin, TX',
        latitude: 30.2672,
        longitude: -97.7431,
        radius: 75,
        timezone: 'America/Chicago',
        enabled: true,
        devices: 1,
      },
    ]);
  }

  getDevices(): Observable<DeviceRecord[]> {
    return of([
      {
        id: 'DEV-001',
        name: 'Main Entrance Face ID',
        deviceType: 'face-recognition',
        locationId: 'LOC-001',
        locationName: 'Headquarters',
        ipAddress: '192.168.10.21',
        macAddress: '00:1B:44:11:3A:B7',
        status: 'online',
        lastSeen: '2026-01-22 09:10:00',
        firmware: 'v2.4.1',
        enabled: true,
      },
      {
        id: 'DEV-002',
        name: 'Side Door Fingerprint',
        deviceType: 'fingerprint',
        locationId: 'LOC-001',
        locationName: 'Headquarters',
        ipAddress: '192.168.10.22',
        macAddress: '00:1B:44:11:3A:B8',
        status: 'maintenance',
        lastSeen: '2026-01-22 08:55:00',
        firmware: 'v1.9.0',
        enabled: true,
      },
      {
        id: 'DEV-003',
        name: 'Austin Mobile Check-in',
        deviceType: 'mobile-app',
        locationId: 'LOC-002',
        locationName: 'Branch Office',
        ipAddress: 'N/A',
        macAddress: 'N/A',
        status: 'offline',
        lastSeen: '2026-01-21 06:30:00',
        firmware: 'v3.1.0',
        enabled: false,
      },
    ]);
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
