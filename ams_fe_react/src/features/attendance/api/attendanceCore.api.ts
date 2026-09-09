import axiosInstance from '../../../core/api/axiosInstance';


const API_BASE = '/v1';

// --- SHIFTS & SCHEDULES ---

export interface ShiftTemplateResponse {
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  graceInMinutes: number;
  graceOutMinutes: number;
  isNightShift: boolean;
  minWorkMinutes: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShiftTemplateUpsertPayload {
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  graceInMinutes: number;
  graceOutMinutes: number;
  isNightShift: boolean;
  minWorkMinutes: number;
  isActive: boolean;
}

export interface ScheduleEmployee {
  id: string;
  name: string;
  department: string;
  employeeCode?: string;
}

export interface EmployeeScheduleDayResponseDto {
  scheduleId: number;
  employeeId: number;
  workDate: string;
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isNightShift: boolean;
  scheduleSource: 'MANUAL' | 'IMPORT';
  note?: string;
}

export interface AssignShiftRangeRequest {
  employeeId: number;
  shiftId: number;
  startDate: string;
  endDate: string;
  scheduleSource: 'MANUAL' | 'IMPORT';
  note?: string;
  overwrite: boolean;
}

export interface AssignShiftRangeResponse {
  employeeId: number;
  shiftId: number;
  startDate: string;
  endDate: string;
  created: number;
  updated: number;
}

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  day: number;
  startTime: string;
  endTime: string;
  type: 'morning' | 'afternoon' | 'night';
  isNightShift?: boolean;
  shiftId?: number;
  workDate?: string;
  scheduleSource?: 'MANUAL' | 'IMPORT';
  hasConflict?: boolean;
}

// --- REQUESTS ---

export interface RequestsResponse {
  requestId: number;
  employeeId: number;
  employeeName: string;
  title: string;
  requestType: 'LEAVE' | 'OVERTIME' | 'REMOTE' | 'LATE_EARLY' | string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | string;
  startDatetime: string;
  endDatetime: string;
  reason: string;
  submittedAt?: string;
  approverName?: string;
  decisionNote?: string;
}

export interface RequestsUpsertRequest {
  employeeId: number;
  requestType: string;
  title: string;
  reason: string;
  startDatetime: string;
  endDatetime: string;
}

export interface RequestsApprovalRequest {
  approverId: number;
  status: 'APPROVED' | 'REJECTED';
  decisionNote?: string;
}

// Helper to extract array correctly based on Spring formats
const extractArray = (res: any) => {
  const data = res.data;
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.items && Array.isArray(data.items)) return data.items;
  if (data.content && Array.isArray(data.content)) return data.content;
  if (data.data) {
    if (Array.isArray(data.data)) return data.data;
    if (data.data.content && Array.isArray(data.data.content)) return data.data.content;
    if (data.data.items && Array.isArray(data.data.items)) return data.data.items;
  }
  return [];
};

// --- SHIFTS API ---
export const shiftApi = {
  getShiftTemplates: async (activeOnly?: boolean, search?: string): Promise<ShiftTemplateResponse[]> => {
    const params = new URLSearchParams();
    if (activeOnly !== undefined) params.set('active', activeOnly.toString());
    if (search) params.set('q', search);
    const res = await axiosInstance.get(`${API_BASE}/shifts`, { params });
    return extractArray(res);
  },
  getShiftTemplateById: async (id: number): Promise<ShiftTemplateResponse> => {
    const res = await axiosInstance.get(`${API_BASE}/shifts/${id}`);
    return res.data?.data || res.data;
  },
  createShiftTemplate: async (payload: ShiftTemplateUpsertPayload): Promise<ShiftTemplateResponse> => {
    const res = await axiosInstance.post(`${API_BASE}/shifts`, payload);
    return res.data?.data || res.data;
  },
  updateShiftTemplate: async (id: number, payload: ShiftTemplateUpsertPayload): Promise<ShiftTemplateResponse> => {
    const res = await axiosInstance.put(`${API_BASE}/shifts/${id}`, payload);
    return res.data?.data || res.data;
  },
  setShiftTemplateActive: async (id: number, active: boolean): Promise<ShiftTemplateResponse> => {
    const res = await axiosInstance.patch(`${API_BASE}/shifts/${id}/active`, null, { params: { active: active.toString() } });
    return res.data?.data || res.data;
  },
  deleteShiftTemplate: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${API_BASE}/shifts/${id}`);
  }
};

// --- SCHEDULE API ---
export const scheduleApi = {
  assignShiftRange: async (payload: AssignShiftRangeRequest): Promise<AssignShiftRangeResponse> => {
    const res = await axiosInstance.post(`${API_BASE}/schedules/assign-range`, payload);
    return res.data?.data || res.data;
  },
  getScheduleByEmployeeDay: async (employeeId: number, date: string): Promise<EmployeeScheduleDayResponseDto[]> => {
    const params = new URLSearchParams({ employeeId: employeeId.toString(), date });
    const res = await axiosInstance.get(`${API_BASE}/schedules/by-employee/day`, { params });
    return extractArray(res);
  },
  // In the real system, employees and departments are fetched. Here we compose them via API calls.
  getScheduleEmployees: async (): Promise<ScheduleEmployee[]> => {
    // Note: We'll compose this within the scheduling component via TanStack Query to let React Query manage the cache,
    // so we don't strictly need a custom merged endpoint unless we do it here. 
    // To match Angular exactly, we could do it here:
    const [empRes, deptRes] = await Promise.all([
      axiosInstance.get(`/employees`),
      axiosInstance.get(`/departments`, { params: new URLSearchParams({ page: '0', size: '1000', sort: 'departmentId,ASC' }) })
    ]);
    const employees = extractArray(empRes);
    const departments = extractArray(deptRes);
    const departmentById = new Map<number, string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    departments.forEach((d: any) => {
      departmentById.set(d.departmentId, d.departmentName);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return employees.map((emp: any) => ({
      id: String(emp.employeeId),
      name: emp.fullName || '',
      department: emp.departmentId ? (departmentById.get(emp.departmentId) || '') : '',
      employeeCode: emp.employeeCode || '',
    }));
  },
  getInitialShifts: async (employeeIds: number[], weekStart: Date): Promise<Shift[]> => {
    if (!employeeIds.length) return [];
    
    // Normalize date to start of day
    const normalizedStart = new Date(weekStart);
    normalizedStart.setHours(0, 0, 0, 0);

    const endDate = new Date(normalizedStart);
    endDate.setDate(normalizedStart.getDate() + 6);

    const startDateStr = `${normalizedStart.getFullYear()}-${String(normalizedStart.getMonth() + 1).padStart(2, '0')}-${String(normalizedStart.getDate()).padStart(2, '0')}`;
    const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    try {
      // Single bulk request for entire week across all employees
      const res = await axiosInstance.get(`${API_BASE}/schedules/by-range`, {
        params: new URLSearchParams({ startDate: startDateStr, endDate: endDateStr })
      });
      const data = extractArray(res);

      const empIdSet = new Set(employeeIds.map(String));
      const shifts: Shift[] = [];

      data.forEach((item: any) => {
        if (!empIdSet.has(String(item.employeeId))) return;

        const itemDate = new Date(`${item.workDate}T00:00:00`);
        const itemTimeMs = itemDate.getTime() - normalizedStart.getTime();
        const dayDiff = Math.round(itemTimeMs / (1000 * 60 * 60 * 24));
        
        let type: 'morning' | 'afternoon' | 'night' = 'morning';
        if (item.isNightShift) type = 'night';
        else {
          const hour = Number((item.startTime || '').split(':')[0]);
          if (Number.isFinite(hour)) type = hour < 12 ? 'morning' : 'afternoon';
        }

        shifts.push({
          id: String(item.scheduleId),
          employeeId: String(item.employeeId),
          employeeName: '',
          day: dayDiff,
          startTime: item.startTime ? item.startTime.substring(0, 5) : '',
          endTime: item.endTime ? item.endTime.substring(0, 5) : '',
          type,
          shiftId: item.shiftId,
          workDate: item.workDate,
        });
      });

      return shifts.filter(s => s.day >= 0 && s.day <= 6);
    } catch {
      return [];
    }
  }
};

// --- REQUESTS API (General) ---
// Maps to /requests endpoint
export const requestApi = {
  getRequestById: async (id: number): Promise<RequestsResponse> => {
    const res = await axiosInstance.get(`/requests/${id}`);
    return res.data?.data || res.data;
  },
  createRequest: async (payload: RequestsUpsertRequest): Promise<RequestsResponse> => {
    // Angular called `${environment.apiBaseUrl}/requests` which might not have the `/v1` since standard endpoints don't inherently.
    // Let's assume standard Vite proxy mapped `/api` to `http://localhost:8080/api`. So I will just map `/requests`.
    const res = await axiosInstance.post(`/requests`, payload);
    return res.data?.data || res.data;
  },
  submitRequestByEmployee: async (id: number, employeeId: number | null): Promise<RequestsResponse> => {
    const params = new URLSearchParams();
    if (employeeId) params.set('employeeId', employeeId.toString());
    const res = await axiosInstance.put(`/requests/${id}/submit`, null, { params });
    return res.data?.data || res.data;
  },
  getMyRequests: async (employeeId: number, status?: string, type?: string): Promise<RequestsResponse[]> => {
    const params = new URLSearchParams({ employeeId: employeeId.toString() });
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    const res = await axiosInstance.get(`/requests`, { params });
    return extractArray(res);
  },
  getAllGlobal: async (status?: string, type?: string): Promise<RequestsResponse[]> => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    const res = await axiosInstance.get(`/requests/all`, { params });
    return extractArray(res);
  },
  // MANAGER: xem hàng đợi đơn của team mình — BE: GET /api/requests/manager-queue?managerId={id}
  getManagerQueue: async (managerId: number, status?: string, type?: string): Promise<RequestsResponse[]> => {
    const params = new URLSearchParams({ managerId: managerId.toString() });
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    const res = await axiosInstance.get(`/requests/manager-queue`, { params });
    return extractArray(res);
  },
  updateRequest: async (id: number, payload: RequestsUpsertRequest): Promise<RequestsResponse> => {
    const params = new URLSearchParams({ employeeId: payload.employeeId.toString() });
    const res = await axiosInstance.put(`/requests/${id}`, payload, { params });
    return res.data?.data || res.data;
  },
  deleteRequest: async (id: number, employeeId: number): Promise<void> => {
    const params = new URLSearchParams({ employeeId: employeeId.toString() });
    await axiosInstance.delete(`/requests/${id}`, { params });
  },
  approveOrReject: async (id: number, payload: RequestsApprovalRequest): Promise<RequestsResponse> => {
    const res = await axiosInstance.put(`/requests/${id}/approval`, payload);
    return res.data?.data || res.data;
  }
};
