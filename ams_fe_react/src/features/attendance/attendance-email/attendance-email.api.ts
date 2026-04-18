import axiosInstance from '../../../core/api/axiosInstance';

export interface AttendanceEmailEmployee {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  email: string | null;
  status: string | null;
}

export interface AttendanceEmailResponse {
  message: string;
  month?: string;
  employeeId?: number;
}

// Mirrors Angular AttendanceService exactly:
// searchAttendanceEmailEmployees() -> GET /api/employees/search?name=&page=&size=&sortBy=&sortDir=
// sendAttendanceEmail()           -> POST /api/attendance-email/send?month=&employeeId=&regenerate=
// sendAttendanceEmailToAll()      -> POST /api/attendance-email/send-all?month=&regenerate=

export const attendanceEmailApi = {
  /**
   * Angular: this.http.get<PageResponse<AttendanceEmailEmployee>>(`${this.employeesUrl}/search`, { params })
   * where params = { name, page (1-based), size, sortBy: 'employee_id', sortDir: 'desc' }
   */
  searchEmployees: async (name: string, page: number, size: number): Promise<any> => {
    const params = new URLSearchParams({
      name,
      page: page.toString(),
      size: size.toString(),
      sortBy: 'employee_id',
      sortDir: 'desc',
    });
    const res = await axiosInstance.get('/employees/search', { params });
    return res.data?.data || res.data;
  },

  /**
   * Angular: POST /api/attendance-email/send-all?month=&regenerate=
   * Fix: Cấu hình mặc định của AxiosInstance gán Content-Type: application/json.
   * Nếu gửi POST nhưng data là undefined/null, Spring Boot sẽ sốc khi thấy header JSON nhưng body rỗng.
   * Cần ép Content-Type về null để Axios hủy Header này, giống hệt Angular.
   */
  sendToAll: async (month: string, regenerate: boolean): Promise<AttendanceEmailResponse> => {
    const params = new URLSearchParams({
      month: month.trim(),
      regenerate: String(Boolean(regenerate))
    });
    const res = await axiosInstance.post('/attendance-email/send-all', undefined, { 
      params,
      headers: { 'Content-Type': null } 
    });
    return res.data?.data || res.data;
  },

  /**
   * Angular: POST /api/attendance-email/send?month=&employeeId=&regenerate=
   */
  sendToEmployee: async (month: string, employeeId: number, regenerate: boolean): Promise<AttendanceEmailResponse> => {
    const params = new URLSearchParams({
      month: month.trim(),
      employeeId: employeeId.toString(),
      regenerate: String(Boolean(regenerate))
    });
    const res = await axiosInstance.post('/attendance-email/send', undefined, { 
      params,
      headers: { 'Content-Type': null } 
    });
    return res.data?.data || res.data;
  },
};
