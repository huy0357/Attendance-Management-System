import axiosInstance from '../../../../core/api/axiosInstance';
import { MonthlySummaryResponse, MonthlySummaryGenerateResponse } from '../../../../shared/models/monthly-summary.model';

/**
 * API Service cho phân hệ Tổng hợp Công Tháng.
 * Ánh xạ tới các endpoint: /api/monthly-summary/* và /api/attendance-email/*
 */
export const monthlySummaryApi = {
  /**
   * Nhân viên tự xem tổng hợp công tháng của mình.
   * GET /api/monthly-summary/me?month=2026-08
   * Tự động fallback tính realtime nếu tháng chưa được chốt.
   */
  getMySummary: async (month: string): Promise<MonthlySummaryResponse> => {
    const res = await axiosInstance.get('/monthly-summary/me', {
      params: { month },
    });
    return res.data?.data || res.data;
  },

  /**
   * Admin/HR xem tổng hợp công tháng của toàn bộ nhân viên.
   * GET /api/monthly-summary/admin?month=2026-08
   */
  getAdminSummary: async (month: string): Promise<MonthlySummaryResponse[]> => {
    const res = await axiosInstance.get('/monthly-summary/admin', {
      params: { month },
    });
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Admin xem tổng hợp công tháng của 1 nhân viên cụ thể.
   * GET /api/monthly-summary/employee/{employeeId}?month=2026-08
   */
  getEmployeeSummary: async (employeeId: number, month: string): Promise<MonthlySummaryResponse> => {
    const res = await axiosInstance.get(`/monthly-summary/employee/${employeeId}`, {
      params: { month },
    });
    return res.data?.data || res.data;
  },

  /**
   * Admin chốt dữ liệu công tháng thủ công.
   * POST /api/monthly-summary/generate?month=2026-08
   */
  generateSummary: async (month: string): Promise<MonthlySummaryGenerateResponse> => {
    const res = await axiosInstance.post('/monthly-summary/generate', null, {
      params: { month },
    });
    return res.data?.data || res.data;
  },

  /**
   * Gửi email báo cáo công tháng cho 1 nhân viên.
   * POST /api/attendance-email/send?month=2026-08&employeeId=5
   */
  sendEmailToEmployee: async (month: string, employeeId: number): Promise<void> => {
    await axiosInstance.post('/attendance-email/send', null, {
      params: { month, employeeId, regenerate: false },
    });
  },

  /**
   * Gửi email báo cáo công tháng cho toàn bộ nhân viên.
   * POST /api/attendance-email/send-all?month=2026-08
   */
  sendEmailAll: async (month: string): Promise<void> => {
    await axiosInstance.post('/attendance-email/send-all', null, {
      params: { month, regenerate: false },
    });
  },

  /**
   * Tải về file Excel tổng hợp công tháng.
   * GET /api/exports/attendance-monthly?month=2026-08
   */
  exportExcel: async (month: string): Promise<Blob> => {
    const res = await axiosInstance.get('/exports/attendance-monthly', {
      params: { month },
      responseType: 'blob',
    });
    return res.data;
  },
};
