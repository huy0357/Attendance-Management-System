import axiosInstance from '../../../core/api/axiosInstance';
export interface ApiResponse<T> {
  data: T;
  message?: string;
  code?: number;
}
import {
  DashboardKpiResponse,
  LivePulseResponse,
  ExceptionsResponse,
} from '../../../shared/models/dashboard.model';

const BASE_URL = '/v1/dashboard';

export const dashboardApi = {
  getKpi: async (date?: string, branchIds?: string[], timezone = 'Asia/Ho_Chi_Minh'): Promise<DashboardKpiResponse> => {
    const params = new URLSearchParams();
    params.set('timezone', timezone);
    if (date) params.set('date', date);
    if (branchIds?.length) branchIds.forEach(id => params.append('branchIds', id));

    const response = await axiosInstance.get<ApiResponse<DashboardKpiResponse>>(`${BASE_URL}/kpi`, { params });
    return response.data.data;
  },

  getLivePulse: async (limit = 20, includeCheckOut = false, branchIds?: string[]): Promise<LivePulseResponse> => {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    params.set('includeCheckOut', includeCheckOut.toString());
    if (branchIds?.length) branchIds.forEach(id => params.append('branchIds', id));

    const response = await axiosInstance.get<ApiResponse<LivePulseResponse>>(`${BASE_URL}/live-pulse`, { params });
    return response.data.data;
  },

  getExceptions: async (
    status?: string[],
    severity?: string[],
    branchIds?: string[],
    limit = 50,
    offset = 0,
  ): Promise<ExceptionsResponse> => {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());
    params.set('sortBy', 'occurrenceTime');
    params.set('sortOrder', 'DESC');
    
    if (status?.length) status.forEach(s => params.append('status', s));
    if (severity?.length) severity.forEach(s => params.append('severity', s));
    if (branchIds?.length) branchIds.forEach(id => params.append('branchIds', id));

    const response = await axiosInstance.get<ApiResponse<ExceptionsResponse>>(`${BASE_URL}/exceptions`, { params });
    return response.data.data;
  },

  resolveException: async (exceptionId: number, notes: string): Promise<void> => {
    await axiosInstance.post<ApiResponse<void>>(`${BASE_URL}/exceptions/${exceptionId}/resolve`, { notes });
  },
};
