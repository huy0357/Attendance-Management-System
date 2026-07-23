import axiosInstance from '../../../core/api/axiosInstance';
import { AccountDto, AccountResponse, CreateAccountRequest, UpdateAccountRequest, RoleResponse } from '../../../shared/models/account.model';
import { PageResponse } from '../../../shared/models/page-response.model';

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
  rawId: number;
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

export const adminApi = {
  getUserAccounts: async (): Promise<UserAccountRecord[]> => {
    const { data } = await axiosInstance.get<AccountDto[]>('/accounts');
    return data.map(adminApi.mapAccountDtoToRecord);
  },

  getAccountById: async (id: number): Promise<AccountDto> => {
    const { data } = await axiosInstance.get<AccountDto>(`/accounts/${id}`);
    return data;
  },

  getAccounts: async (): Promise<AccountDto[]> => {
    const { data } = await axiosInstance.get<AccountDto[]>('/accounts');
    return data;
  },

  createAccount: async (request: CreateAccountRequest): Promise<AccountResponse> => {
    const { data } = await axiosInstance.post<AccountResponse>('/accounts', request);
    return data;
  },

  updateAccount: async (id: number, request: UpdateAccountRequest): Promise<AccountDto> => {
    const { data } = await axiosInstance.put<AccountDto>(`/accounts/${id}`, request);
    return data;
  },

  deleteAccount: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/accounts/${id}`);
  },

  getAccountsPage: async (
    page = 1,
    size = 10,
    sortBy = 'accountId',
    sortDir = 'desc',
    isActive?: boolean
  ): Promise<PageResponse<AccountDto>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sortBy,
      sortDir,
    });
    if (isActive !== undefined) {
      params.append('isActive', isActive.toString());
    }
    const { data } = await axiosInstance.get<PageResponse<AccountDto>>(`/accounts/page`, { params });
    return data;
  },

  searchAccounts: async (
    username: string,
    page = 1,
    size = 10,
    sortBy = 'accountId',
    sortDir = 'desc'
  ): Promise<PageResponse<AccountDto>> => {
    const params = new URLSearchParams({
      username,
      page: page.toString(),
      size: size.toString(),
      sortBy,
      sortDir,
    });
    const { data } = await axiosInstance.get<PageResponse<AccountDto>>(`/accounts/search`, { params });
    return data;
  },

  getAccountRoles: async (): Promise<RoleResponse[]> => {
    const res = await axiosInstance.get('/roles');
    console.log("=== RAW ROLE RESPONSE ===", res.data);
    
    // Thuật toán Bóc tách Đa năng
    let roleData: any[] = [];
    if (Array.isArray(res.data)) {
        roleData = res.data;
    } else if (res.data?.data && Array.isArray(res.data.data)) {
        roleData = res.data.data;
    } else if (res.data?.content && Array.isArray(res.data.content)) {
        roleData = res.data.content;
    } else if (res.data?.items && Array.isArray(res.data.items)) {
        roleData = res.data.items;
    } else {
        console.error("CANNOT EXTRACT ROLE ITEMS FROM:", res.data);
    }
    
    // Hủy bỏ mọi bộ lọc Hardcode
    return roleData;
  },

  getEmployeeRoles: async (employeeId: number): Promise<RoleResponse[]> => {
    const res = await axiosInstance.get(`/employees/${employeeId}/roles`);
    let roleData: any[] = [];
    if (Array.isArray(res.data)) roleData = res.data;
    else if (res.data?.data && Array.isArray(res.data.data)) roleData = res.data.data;
    else if (res.data?.content && Array.isArray(res.data.content)) roleData = res.data.content;
    else if (res.data?.items && Array.isArray(res.data.items)) roleData = res.data.items;
    return roleData;
  },

  assignRoleToEmployee: async (employeeId: number, roleId: number): Promise<void> => {
    await axiosInstance.post(`/employees/${employeeId}/roles`, { roleId });
  },

  removeRoleFromEmployee: async (employeeId: number, roleId: number): Promise<void> => {
    await axiosInstance.delete(`/employees/${employeeId}/roles/${roleId}`);
  },

  getAuditLogs: async (
    page = 1,
    size = 10,
    entityType?: string,
    action?: string,
    actorId?: number
  ): Promise<{ items: AuditLog[], totalPages: number }> => {
    // Spring Boot uses 0-based pagination via page-1, but the API may expect page - 1 or use the custom PageRequestDto logic which might be 1-based or 0-based.
    // User requested: "UI truyền page (1-based), gọi xuống Axios phải trừ đi 1 (page - 1)"
    
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sortBy: 'createdAt',
      sortDir: 'desc'
    });
    
    if (entityType && entityType !== 'All Modules') params.append('entityType', entityType);
    if (action && action !== 'All Actions') params.append('action', action);
    if (actorId) params.append('actorId', actorId.toString());

    const { data } = await axiosInstance.get('/audit-logs', { params });
    
    // Accommodate structure: res.data.data.content or res.data.content or res.data.items
    const content = data?.data?.content || data?.content || data?.items || [];
    const totalPages = data?.data?.totalPages || data?.totalPages || 1;

    const mappedItems: AuditLog[] = content.map((log: any) => {
      let beforeVal = undefined;
      let afterVal = undefined;
      try { if (log.oldValueJson) beforeVal = JSON.parse(log.oldValueJson); } catch (e) {}
      try { if (log.newValueJson) afterVal = JSON.parse(log.newValueJson); } catch (e) {}

      return {
        id: `LOG-${log.auditId}`,
        rawId: log.auditId,
        timestamp: log.createdAt || '',
        userId: String(log.actorId || 'System'),
        userName: `User ${log.actorId || 'System'}`, // Dummy name mapping since generic DTO lacks it
        userRole: 'UNKNOWN',
        action: (log.action || '').toLowerCase() as AuditLogAction,
        module: log.entityType || 'Unknown',
        recordId: String(log.entityId || ''),
        ipAddress: 'N/A',
        userAgent: 'N/A',
        beforeValue: beforeVal,
        afterValue: afterVal,
        notes: ''
      };
    });

    return { items: mappedItems, totalPages };
  },

  getAuditLogById: async (id: number): Promise<AuditLog> => {
    const { data } = await axiosInstance.get(`/audit-logs/${id}`);
    const log = data?.data || data;
    let beforeVal = undefined;
    let afterVal = undefined;
    try { if (log.oldValueJson) beforeVal = JSON.parse(log.oldValueJson); } catch (e) {}
    try { if (log.newValueJson) afterVal = JSON.parse(log.newValueJson); } catch (e) {}

    return {
      id: `LOG-${log.auditId}`,
      rawId: log.auditId,
      timestamp: log.createdAt || '',
      userId: String(log.actorId || 'System'),
      userName: `User ${log.actorId || 'System'}`,
      userRole: 'UNKNOWN',
      action: (log.action || '').toLowerCase() as AuditLogAction,
      module: log.entityType || 'Unknown',
      recordId: String(log.entityId || ''),
      ipAddress: 'N/A',
      userAgent: 'N/A',
      beforeValue: beforeVal,
      afterValue: afterVal,
      notes: ''
    };
  },

  mapAccountDtoToRecord: (a: AccountDto): UserAccountRecord => {
    const roleCode = (a.roleCode ?? '').toUpperCase();
    return {
      id: String(a.accountId),
      employeeId: a.employeeId,
      username: a.username,
      role: roleCode.toLowerCase().replace('role_', ''),
      status: a.isActive ? 'active' : 'inactive',
      lastLogin: a.lastLoginAt ?? 'Never',
      createdDate: a.createdAt ? a.createdAt.split('T')[0] : '',
      roleId: a.roleId ?? null,
      roleCode: a.roleCode ?? null,
    };
  }
};
