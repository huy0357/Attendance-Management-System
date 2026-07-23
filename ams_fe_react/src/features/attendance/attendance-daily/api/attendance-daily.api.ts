import axiosInstance from '../../../../core/api/axiosInstance';
import { SpringPage } from '../../../../shared/models/page-response.model';
import { AttendanceDailyResponse } from '../../../../shared/models/attendance-daily.model';

export interface AdminAttendanceBatchResponse {
  message: string;
  date: string;
}

export interface MonthlySummaryGenerateResponse {
  message: string;
  month: string;
  affectedRows: number;
}

export interface ScheduleEmployee {
  id: string;
  name: string;
  department: string;
  employeeCode?: string;
}

const API_BASE = '';

export const attendanceDailyApi = {
  getAttendanceDailyAdmin: async (from: string, to: string, page: number, size: number): Promise<SpringPage<AttendanceDailyResponse>> => {
    try {
      const params = new URLSearchParams({
        from, to, page: page.toString(), size: size.toString()
      });
      const res = await axiosInstance.get<SpringPage<AttendanceDailyResponse>>(`${API_BASE}/attendance-daily/admin`, { params });
      return (res.data as any).data || res.data; 
    } catch (error: any) {
      if (error.response && error.response.status === 403) {
        throw new Error("Bạn không có quyền truy cập dữ liệu này.");
      }
      throw error;
    }
  },

  getMyAttendanceDaily: async (from: string, to: string, page: number, size: number): Promise<SpringPage<AttendanceDailyResponse>> => {
    const params = new URLSearchParams({
      from, to, page: page.toString(), size: size.toString()
    });
    const res = await axiosInstance.get<SpringPage<AttendanceDailyResponse>>(`${API_BASE}/attendance-daily/me`, { params });
    return (res.data as any).data || res.data;
  },

  getAttendanceDailyEmployee: async (employeeId: number, from: string, to: string, page: number, size: number): Promise<SpringPage<AttendanceDailyResponse>> => {
    const params = new URLSearchParams({
      from, to, page: page.toString(), size: size.toString()
    });
    const res = await axiosInstance.get<SpringPage<AttendanceDailyResponse>>(`${API_BASE}/attendance-daily/employee/${employeeId}`, { params });
    return (res.data as any).data || res.data;
  },

  runAttendanceBatchForDate: async (date: string): Promise<AdminAttendanceBatchResponse> => {
    const params = new URLSearchParams({ date });
    const res = await axiosInstance.post<AdminAttendanceBatchResponse | { data: AdminAttendanceBatchResponse }>(
      `${API_BASE}/admin/attendance/run-batch`, null, { params }
    );
    return (res.data as any).data || res.data;
  },

  getScheduleEmployees: async (): Promise<ScheduleEmployee[]> => {
    // Porting the getScheduleEmployees logic
    const headers = { 'Cache-Control': 'no-cache', Pragma: 'no-cache' };
    const [empRes, deptRes] = await Promise.all([
      axiosInstance.get<any>(`${API_BASE}/employees`, { headers }),
      axiosInstance.get<any>(`${API_BASE}/departments`, {
        params: { page: 0, size: 1000, sort: 'departmentId,ASC' },
        headers
      })
    ]);

    const employees = empRes.data?.data || empRes.data || [];
    const departments = deptRes.data?.data?.content || deptRes.data?.content || [];

    const departmentById = new Map<number, string>();
    departments.forEach((dept: any) => {
      departmentById.set(dept.departmentId, dept.departmentName ?? '');
    });

    return employees.map((emp: any) => ({
      id: String(emp.employeeId),
      name: emp.fullName ?? '',
      department: emp.departmentId ? (departmentById.get(emp.departmentId) ?? '') : '',
      employeeCode: emp.employeeCode ?? '',
    }));
  },

  generateMonthlySummary: async (month: string): Promise<MonthlySummaryGenerateResponse> => {
    const params = new URLSearchParams({ month });
    const res = await axiosInstance.post<any>(`${API_BASE}/monthly-summary/generate`, null, { params });
    return res.data?.data || res.data;
  },

  exportAttendanceMonthly: async (month: string): Promise<Blob> => {
    const params = new URLSearchParams({ month });
    const res = await axiosInstance.get(`${API_BASE}/exports/attendance-monthly`, {
      params,
      responseType: 'blob'
    });
    return res.data;
  }
};
