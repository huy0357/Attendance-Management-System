import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AccountDto,
  AccountResponse,
  CreateAccountRequest,
  UpdateAccountRequest,
} from '../../shared/models/account.model';
import { PageResponse } from '../../shared/models/page-response.model';

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
  recordType: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  ipAddress: string;
  userAgent: string;
  notes?: string;
}

export interface AuditLogFilters {
  searchQuery?: string;
  module?: string;
  action?: AuditLogAction | 'all';
  user?: string;
  startDate?: string;
  endDate?: string;
}

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

export type DeviceType = 'face-recognition' | 'fingerprint' | 'card-reader' | 'mobile-app';
export type DeviceStatus = 'online' | 'offline' | 'maintenance';

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

export type AccountRole = 'admin' | 'manager' | 'hr' | 'employee';
export type AccountStatus = 'active' | 'inactive' | 'suspended';

export interface UserAccountRecord {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  department: string;
  status: AccountStatus;
  lastLogin: string;
  createdDate: string;
  permissions: string[];
}

export interface AccountRoleDefinition {
  id: string;
  name: string;
  type: AccountRole;
  users: number;
  description: string;
  color: 'red' | 'blue' | 'green' | 'gray';
}

export interface PermissionDefinition {
  id: string;
  name: string;
  module: string;
  description: string;
}

export type BackupType = 'full' | 'incremental' | 'manual' | 'differential' | 'partial';
export type BackupStatus = 'completed' | 'in-progress' | 'failed';

export interface BackupRecord {
  id: string;
  name: string;
  date: string;
  time: string;
  size: string;
  type: BackupType;
  status: BackupStatus;
  duration: string;
  recordCount: number;
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

export interface CreateBackupRequest {
  name: string;
  type: 'full' | 'partial';
  description?: string;
  compression: boolean;
  encryption: boolean;
}

export interface RestoreBackupRequest {
  backupId: string;
  acknowledge: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly baseUrl = `${environment.apiBaseUrl}/admin`;
  private readonly accountsUrl = `${environment.apiBaseUrl}/accounts`;

  constructor(private http: HttpClient) { }

  // TODO (NO API YET): Map audit log and backup/restore endpoints under /api/admin.
  getAuditLogs(): Observable<AuditLog[]> {
    return of([
      {
        id: 'LOG-001',
        timestamp: '2026-01-22 14:35:22',
        userId: 'ADMIN-001',
        userName: 'Admin User',
        userRole: 'System Administrator',
        action: 'lock',
        module: 'Payroll Periods',
        recordId: 'PP-2026-01',
        recordType: 'PayrollPeriod',
        beforeValue: { status: 'approved', locked: false },
        afterValue: { status: 'locked', locked: true, lockedBy: 'Admin User', lockDate: '2026-01-22' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        notes: 'Payroll period locked for compliance',
      },
      {
        id: 'LOG-002',
        timestamp: '2026-01-22 13:20:15',
        userId: 'HR-003',
        userName: 'Emma Wilson',
        userRole: 'HR Manager',
        action: 'update',
        module: 'Employees',
        recordId: 'EMP-042',
        recordType: 'Employee',
        beforeValue: { salary: 80000, position: 'Developer' },
        afterValue: { salary: 85000, position: 'Senior Developer' },
        ipAddress: '192.168.1.105',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        notes: 'Annual salary review - promotion',
      },
      {
        id: 'LOG-003',
        timestamp: '2026-01-22 11:45:30',
        userId: 'ADMIN-001',
        userName: 'Admin User',
        userRole: 'System Administrator',
        action: 'approve',
        module: 'OT Requests',
        recordId: 'OT-003',
        recordType: 'OTRequest',
        beforeValue: { status: 'pending' },
        afterValue: { status: 'approved', approvedBy: 'Admin User', approvedDate: '2026-01-22' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        notes: 'Critical project deadline',
      },
      {
        id: 'LOG-004',
        timestamp: '2026-01-22 10:15:45',
        userId: 'MGR-001',
        userName: 'Sarah Chen',
        userRole: 'Operations Manager',
        action: 'create',
        module: 'Contracts',
        recordId: 'CT-008',
        recordType: 'Contract',
        afterValue: {
          employeeId: 'EMP-099',
          employeeName: 'New Employee',
          contractType: 'probation',
          startDate: '2026-02-01',
          baseSalary: 70000,
        },
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        notes: 'New hire - probation period',
      },
      {
        id: 'LOG-005',
        timestamp: '2026-01-22 09:30:12',
        userId: 'HR-003',
        userName: 'Emma Wilson',
        userRole: 'HR Manager',
        action: 'delete',
        module: 'Employees',
        recordId: 'EMP-098',
        recordType: 'Employee',
        beforeValue: {
          name: 'Former Employee',
          status: 'terminated',
          department: 'Sales',
        },
        ipAddress: '192.168.1.105',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        notes: 'Data cleanup - employee left 6 months ago',
      },
      {
        id: 'LOG-006',
        timestamp: '2026-01-22 08:00:00',
        userId: 'ADMIN-001',
        userName: 'Admin User',
        userRole: 'System Administrator',
        action: 'login',
        module: 'System',
        recordId: 'SESSION-12345',
        recordType: 'Session',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      {
        id: 'LOG-007',
        timestamp: '2026-01-21 18:30:00',
        userId: 'ADMIN-001',
        userName: 'Admin User',
        userRole: 'System Administrator',
        action: 'logout',
        module: 'System',
        recordId: 'SESSION-12344',
        recordType: 'Session',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      {
        id: 'LOG-008',
        timestamp: '2026-01-21 16:45:22',
        userId: 'ADMIN-001',
        userName: 'Admin User',
        userRole: 'System Administrator',
        action: 'unlock',
        module: 'Payroll Periods',
        recordId: 'PP-2025-12',
        recordType: 'PayrollPeriod',
        beforeValue: { status: 'locked', locked: true },
        afterValue: { status: 'approved', locked: false },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        notes: 'Correction needed for overtime calculations',
      },
      {
        id: 'LOG-009',
        timestamp: '2026-01-21 14:20:30',
        userId: 'HR-003',
        userName: 'Emma Wilson',
        userRole: 'HR Manager',
        action: 'update',
        module: 'Time Calculation',
        recordId: 'TC-2026-01-21-042',
        recordType: 'TimeRecord',
        beforeValue: { regularHours: 7.5, overtimeHours: 0 },
        afterValue: { regularHours: 8.0, overtimeHours: 0.5 },
        ipAddress: '192.168.1.105',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        notes: 'Manual correction after verification',
      },
      {
        id: 'LOG-010',
        timestamp: '2026-01-21 11:15:00',
        userId: 'MGR-002',
        userName: 'Michael Ross',
        userRole: 'Sales Manager',
        action: 'reject',
        module: 'OT Requests',
        recordId: 'OT-010',
        recordType: 'OTRequest',
        beforeValue: { status: 'pending' },
        afterValue: { status: 'rejected', rejectedBy: 'Michael Ross', rejectedDate: '2026-01-21' },
        ipAddress: '192.168.1.108',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        notes: 'Not justified - can be completed during regular hours',
      },
    ]);
  }

  getBackupList(): Observable<BackupRecord[]> {
    return of([
      {
        id: '1',
        name: 'Daily_Backup_2025-01-23',
        date: '2025-01-23',
        time: '02:00 AM',
        size: '2.4 GB',
        type: 'full',
        status: 'completed',
        duration: '12 min',
        recordCount: 125840,
      },
      {
        id: '2',
        name: 'Daily_Backup_2025-01-22',
        date: '2025-01-22',
        time: '02:00 AM',
        size: '2.3 GB',
        type: 'full',
        status: 'completed',
        duration: '11 min',
        recordCount: 124532,
      },
      {
        id: '3',
        name: 'Weekly_Backup_2025-01-20',
        date: '2025-01-20',
        time: '01:00 AM',
        size: '2.2 GB',
        type: 'full',
        status: 'completed',
        duration: '15 min',
        recordCount: 123456,
      },
      {
        id: '4',
        name: 'Manual_Backup_2025-01-18',
        date: '2025-01-18',
        time: '03:30 PM',
        size: '850 MB',
        type: 'manual',
        status: 'completed',
        duration: '5 min',
        recordCount: 45123,
      },
      {
        id: '5',
        name: 'Daily_Backup_2025-01-17',
        date: '2025-01-17',
        time: '02:00 AM',
        size: '2.1 GB',
        type: 'full',
        status: 'completed',
        duration: '13 min',
        recordCount: 122001,
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
        name: 'Headquarters - Main Office',
        address: '123 Business Park, San Francisco, CA 94105',
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 100,
        timezone: 'America/Los_Angeles',
        enabled: true,
        devices: 5,
      },
      {
        id: 'LOC-002',
        name: 'Branch Office - New York',
        address: '456 Corporate Plaza, New York, NY 10001',
        latitude: 40.7128,
        longitude: -74.006,
        radius: 75,
        timezone: 'America/New_York',
        enabled: true,
        devices: 3,
      },
      {
        id: 'LOC-003',
        name: 'Manufacturing Plant - Austin',
        address: '789 Industrial Way, Austin, TX 78701',
        latitude: 30.2672,
        longitude: -97.7431,
        radius: 150,
        timezone: 'America/Chicago',
        enabled: true,
        devices: 8,
      },
      {
        id: 'LOC-004',
        name: 'Warehouse - Seattle',
        address: '321 Logistics Drive, Seattle, WA 98101',
        latitude: 47.6062,
        longitude: -122.3321,
        radius: 200,
        timezone: 'America/Los_Angeles',
        enabled: false,
        devices: 0,
      },
    ]);
  }

  getDevices(): Observable<DeviceRecord[]> {
    return of([
      {
        id: 'DEV-001',
        name: 'Main Entrance - Face Recognition',
        deviceType: 'face-recognition',
        locationId: 'LOC-001',
        locationName: 'Headquarters - Main Office',
        ipAddress: '192.168.1.101',
        macAddress: '00:1B:44:11:3A:B7',
        status: 'online',
        lastSeen: '2026-01-22 14:35:22',
        firmware: 'v2.4.1',
        enabled: true,
      },
      {
        id: 'DEV-002',
        name: 'Back Entrance - Card Reader',
        deviceType: 'card-reader',
        locationId: 'LOC-001',
        locationName: 'Headquarters - Main Office',
        ipAddress: '192.168.1.102',
        macAddress: '00:1B:44:11:3A:B8',
        status: 'online',
        lastSeen: '2026-01-22 14:34:55',
        firmware: 'v1.8.3',
        enabled: true,
      },
      {
        id: 'DEV-003',
        name: 'Lobby - Fingerprint Scanner',
        deviceType: 'fingerprint',
        locationId: 'LOC-001',
        locationName: 'Headquarters - Main Office',
        ipAddress: '192.168.1.103',
        macAddress: '00:1B:44:11:3A:B9',
        status: 'offline',
        lastSeen: '2026-01-22 08:15:00',
        firmware: 'v2.1.0',
        enabled: true,
      },
      {
        id: 'DEV-004',
        name: 'Executive Floor - Face Recognition',
        deviceType: 'face-recognition',
        locationId: 'LOC-001',
        locationName: 'Headquarters - Main Office',
        ipAddress: '192.168.1.104',
        macAddress: '00:1B:44:11:3A:BA',
        status: 'maintenance',
        lastSeen: '2026-01-21 16:00:00',
        firmware: 'v2.4.1',
        enabled: false,
      },
      {
        id: 'DEV-005',
        name: 'Mobile App - All Employees',
        deviceType: 'mobile-app',
        locationId: 'LOC-001',
        locationName: 'Headquarters - Main Office',
        ipAddress: 'N/A',
        macAddress: 'N/A',
        status: 'online',
        lastSeen: '2026-01-22 14:36:00',
        firmware: 'v3.2.0',
        enabled: true,
      },
      {
        id: 'DEV-006',
        name: 'Main Entrance - Face Recognition',
        deviceType: 'face-recognition',
        locationId: 'LOC-002',
        locationName: 'Branch Office - New York',
        ipAddress: '192.168.2.101',
        macAddress: '00:1B:44:22:4B:C1',
        status: 'online',
        lastSeen: '2026-01-22 14:35:10',
        firmware: 'v2.4.1',
        enabled: true,
      },
      {
        id: 'DEV-007',
        name: 'Side Door - Card Reader',
        deviceType: 'card-reader',
        locationId: 'LOC-002',
        locationName: 'Branch Office - New York',
        ipAddress: '192.168.2.102',
        macAddress: '00:1B:44:22:4B:C2',
        status: 'online',
        lastSeen: '2026-01-22 14:33:45',
        firmware: 'v1.8.3',
        enabled: true,
      },
      {
        id: 'DEV-008',
        name: 'Mobile App - NY Employees',
        deviceType: 'mobile-app',
        locationId: 'LOC-002',
        locationName: 'Branch Office - New York',
        ipAddress: 'N/A',
        macAddress: 'N/A',
        status: 'online',
        lastSeen: '2026-01-22 14:36:00',
        firmware: 'v3.2.0',
        enabled: true,
      },
    ]);
  }

  /* ====== ACCOUNT ENDPOINTS (wired to BE /api/accounts) ====== */

  /** GET /api/accounts → mapped to UserAccountRecord[] for UI compatibility. */
  getUserAccounts(): Observable<UserAccountRecord[]> {
    return this.http.get<AccountDto[]>(this.accountsUrl).pipe(
      map((accounts) => accounts.map((a) => this.mapAccountDtoToRecord(a))),
    );
  }

  /** GET /api/accounts/{id} */
  getAccountById(id: number): Observable<AccountDto> {
    return this.http.get<AccountDto>(`${this.accountsUrl}/${id}`);
  }

  /** POST /api/accounts */
  createAccount(request: CreateAccountRequest): Observable<AccountResponse> {
    return this.http.post<AccountResponse>(this.accountsUrl, request);
  }

  /** PUT /api/accounts/{id} */
  updateAccount(id: number, request: UpdateAccountRequest): Observable<AccountDto> {
    return this.http.put<AccountDto>(`${this.accountsUrl}/${id}`, request);
  }

  /** DELETE /api/accounts/{id} */
  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.accountsUrl}/${id}`);
  }

  /** GET /api/accounts/page?page&size&sortBy&sortDir&isActive */
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

  /** GET /api/accounts/search?username&page&size&sortBy&sortDir */
  searchAccounts(
    username: string,
    page = 0,
    size = 10,
    sortBy = 'accountId',
    sortDir = 'desc'
  ): Observable<PageResponse<AccountDto>> {
    const params = new HttpParams()
      .set('username', username)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);
    return this.http.get<PageResponse<AccountDto>>(`${this.accountsUrl}/search`, { params });
  }


  /** Map BE AccountDto → FE UserAccountRecord for UI compatibility. */
  private mapAccountDtoToRecord(a: AccountDto): UserAccountRecord {
    return {
      id: String(a.accountId),
      name: a.username,
      email: '',
      role: a.role as AccountRole,
      department: '',
      status: a.isActive ? 'active' : 'inactive',
      lastLogin: a.lastLoginAt ?? 'Never',
      createdDate: a.createdAt ? a.createdAt.split('T')[0] : '',
      permissions: [],
    };
  }

  getAccountRoles(): Observable<AccountRoleDefinition[]> {
    return of([
      {
        id: '1',
        name: 'Administrator',
        type: 'admin',
        users: 1,
        description: 'Full system access with all permissions',
        color: 'red',
      },
      {
        id: '2',
        name: 'Manager',
        type: 'manager',
        users: 2,
        description: 'Manage team members, approve requests, view reports',
        color: 'blue',
      },
      {
        id: '3',
        name: 'HR Staff',
        type: 'hr',
        users: 1,
        description: 'Manage employees, payroll, and HR operations',
        color: 'green',
      },
      {
        id: '4',
        name: 'Employee',
        type: 'employee',
        users: 2,
        description: 'Basic access to own data and self-service features',
        color: 'gray',
      },
    ]);
  }

  getPermissions(): Observable<PermissionDefinition[]> {
    return of([
      { id: '1', name: 'View Dashboard', module: 'Dashboard', description: 'Access to main dashboard' },
      { id: '2', name: 'Manage Employees', module: 'Employees', description: 'Create, edit, delete employee records' },
      { id: '3', name: 'View Reports', module: 'Reports', description: 'Access to all reports and analytics' },
      { id: '4', name: 'Manage Payroll', module: 'Payroll', description: 'Process payroll and manage salary data' },
      { id: '5', name: 'Approve Leave', module: 'Leave', description: 'Approve or reject leave requests' },
      { id: '6', name: 'Manage Schedules', module: 'Scheduling', description: 'Create and modify work schedules' },
      { id: '7', name: 'View Audit Logs', module: 'Security', description: 'Access system audit logs' },
      { id: '8', name: 'Manage Settings', module: 'Settings', description: 'Configure system settings' },
      { id: '9', name: 'Manage Users', module: 'Accounts', description: 'Create and manage user accounts' },
      { id: '10', name: 'Backup & Restore', module: 'System', description: 'Perform backup and restore operations' },
    ]);
  }

  exportAuditLogs(_: AuditLogFilters): Observable<Blob> {
    return of(new Blob());
  }

  createManualBackup(_: CreateBackupRequest): Observable<{ id: string }> {
    return of({ id: 'manual-backup' });
  }

  restoreBackup(_: RestoreBackupRequest): Observable<void> {
    return of(undefined);
  }

  deleteBackup(_: string): Observable<void> {
    return of(undefined);
  }
}
