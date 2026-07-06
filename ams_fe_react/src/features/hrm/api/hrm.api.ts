import axiosInstance from '../../../core/api/axiosInstance';
import { PageResponse } from '../../../shared/models/page-response.model';
import { ProfileDto, UpdateProfileRequest } from '../../../shared/models/profile.model';


export interface EmployeeDto {
  employeeId: number;
  employeeCode: string | null;
  fullName: string | null;
  dob: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  departmentId: number | null;
  managerId: number | null;
  hireDate: string | null;
  terminatedDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  avatarUrl: string | null;
}

export interface EmployeeRequest {
  employeeCode?: string;
  fullName: string;
  dob?: string;
  gender?: string;
  phone?: string;
  email?: string;
  departmentId?: number;
  managerId?: number;
  hireDate?: string;
}

export interface DepartmentDto {
  departmentId: number;
  departmentName: string;
  departmentCode?: string;
  parentDepartmentId?: number;
  parentDepartmentName?: string;
  isActive?: boolean;
  children?: DepartmentDto[];
}

export interface DepartmentRequest {
  departmentName: string;
  departmentCode?: string;
  parentDepartmentId?: number | null;
  isActive?: boolean;
}



const API_BASE = '';

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

export const employeeApi = {
  getAll: async (): Promise<EmployeeDto[]> => {
    const res = await axiosInstance.get(`${API_BASE}/employees`);
    return extractArray(res);
  },

  getDepartments: async (): Promise<DepartmentDto[]> => {
    const params = new URLSearchParams({ page: '0', size: '1000', sort: 'departmentId,asc' });
    const res = await axiosInstance.get(`${API_BASE}/departments`, { params });
    return extractArray(res);
  },
  getById: async (id: number): Promise<EmployeeDto> => {
    const res = await axiosInstance.get(`${API_BASE}/employees/${id}`);
    return res.data?.data || res.data;
  },
  create: async (payload: EmployeeRequest): Promise<EmployeeDto> => {
    const res = await axiosInstance.post(`${API_BASE}/employees`, payload);
    return res.data?.data || res.data;
  },
  update: async (id: number, payload: EmployeeRequest): Promise<EmployeeDto> => {
    const res = await axiosInstance.put(`${API_BASE}/employees/${id}`, payload);
    return res.data?.data || res.data;
  },
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${API_BASE}/employees/${id}`);
  },
  getPage: async (page: number, size: number, sortBy = 'employee_id', sortDir = 'asc'): Promise<PageResponse<EmployeeDto>> => {
    // UI is 1-based, Spring Boot PageRequest is 0-based
    const zeroBasedPage = Math.max(0, page - 1);
    const params = new URLSearchParams({ page: zeroBasedPage.toString(), size: size.toString(), sortBy, sortDir });
    const res = await axiosInstance.get(`${API_BASE}/employees/page`, { params });
    const data = res.data?.data || res.data;
    return {
      items: data.items || data.content || [],
      totalItems: data.totalItems || data.totalElements || 0,
      totalPages: data.totalPages || 0,
      // map back to 1-based for UI if BE returns 0-based
      page: page,
      size: data.size || size,
      hasNext: data.hasNext ?? (!data.last),
      hasPrev: data.hasPrev ?? (!data.first)
    };
  },
  searchByName: async (name: string, page: number, size: number, sortBy = 'employee_id', sortDir = 'asc'): Promise<PageResponse<EmployeeDto>> => {
    // UI is 1-based, Spring Boot PageRequest is 0-based
    const zeroBasedPage = Math.max(0, page - 1);
    const params = new URLSearchParams({ name, page: zeroBasedPage.toString(), size: size.toString(), sortBy, sortDir });
    const res = await axiosInstance.get(`${API_BASE}/employees/search`, { params });
    const data = res.data?.data || res.data;
    return {
      items: data.items || data.content || [],
      totalItems: data.totalItems || data.totalElements || 0,
      totalPages: data.totalPages || 0,
      // map back to 1-based for UI if BE returns 0-based
      page: page,
      size: data.size || size,
      hasNext: data.hasNext ?? (!data.last),
      hasPrev: data.hasPrev ?? (!data.first)
    };
  },
  // ✅ BE: GET /api/exports/employees — EmployeeExportController.java
  exportEmployees: async (): Promise<Blob> => {
    const res = await axiosInstance.get(`${API_BASE}/exports/employees`, { responseType: 'blob' });
    return res.data;
  },
};



export const departmentApi = {
  getAll: async (page: number, size: number, keyword: string, sortBy: string, sortDir: string): Promise<PageResponse<DepartmentDto>> => {
    // Angular DepartmentService uses `page - 1` and `sort = sortBy,SORTDIR` format
    const params = new URLSearchParams();
    params.set('page', (page - 1).toString());
    params.set('size', size.toString());
    params.set('sort', `${sortBy},${sortDir.toUpperCase()}`);
    if (keyword) params.set('keyword', keyword);
    
    const res = await axiosInstance.get(`${API_BASE}/departments`, { params });
    const data = res.data?.data || res.data;
    return {
      items: data.content || [],
      totalItems: data.totalElements || 0,
      totalPages: data.totalPages || 0,
      page: (data.number || 0) + 1,
      size: data.size || size,
      hasNext: !data.last,
      hasPrev: !data.first
    };
  },
  getById: async (id: number): Promise<DepartmentDto> => {
    const res = await axiosInstance.get(`${API_BASE}/departments/${id}`);
    return res.data?.data || res.data;
  },
  create: async (payload: DepartmentRequest): Promise<DepartmentDto> => {
    const res = await axiosInstance.post(`${API_BASE}/departments`, payload);
    return res.data?.data || res.data;
  },
  update: async (id: number, payload: DepartmentRequest): Promise<DepartmentDto> => {
    const res = await axiosInstance.put(`${API_BASE}/departments/${id}`, payload);
    return res.data?.data || res.data;
  },
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${API_BASE}/departments/${id}`);
  },
  getTree: async (): Promise<DepartmentDto[]> => {
    const res = await axiosInstance.get(`${API_BASE}/departments/tree`);
    return extractArray(res);
  }
};

export const profileApi = {
  getMyProfile: async (): Promise<ProfileDto> => {
    const res = await axiosInstance.get(`/v1/profile/me`);
    const p = res.data?.data || res.data || {};
    return {
      ...p,
      avatarLabel: (p.fullName || p.username || 'U').split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]?.toUpperCase() || '').join('')
    };
  },
  updateMyProfile: async (payload: UpdateProfileRequest): Promise<ProfileDto> => {
    const cleaned = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));
    const res = await axiosInstance.put(`/v1/profile/me`, cleaned);
    return res.data?.data || res.data;
  },
  uploadMyAvatar: async (file: File): Promise<ProfileDto> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axiosInstance.post(`/v1/profile/avatar`, formData);
    return res.data?.data || res.data;
  }
};
