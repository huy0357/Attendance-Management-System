import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RoleResponse } from '../../../shared/models/account.model';

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
  positionId: number | null;
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
  positionId?: number;
  managerId?: number;
  hireDate?: string;
}

export interface PageResponse<T> {
  items: T[];
  content?: T[];
  data?: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface DepartmentDto {
  departmentId: number;
  departmentName: string;
  departmentCode?: string;
  parentDepartmentId?: number;
  parentDepartmentName?: string;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly baseUrl = `${environment.apiBaseUrl}/employees`;
  private readonly departmentsUrl = `${environment.apiBaseUrl}/departments`;
  private readonly exportsUrl = `${environment.apiBaseUrl}/exports`;
  private readonly rolesUrl = `${environment.apiBaseUrl}/roles`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<EmployeeDto[]> {
    return this.http
      .get<EmployeeDto[] | { items?: EmployeeDto[]; content?: EmployeeDto[]; data?: EmployeeDto[] }>(this.baseUrl)
      .pipe(
        map(response => {
          if (Array.isArray(response)) return response;
          if (response?.items && Array.isArray(response.items)) return response.items;
          if (response?.content && Array.isArray(response.content)) return response.content;
          if (response?.data && Array.isArray(response.data)) return response.data;
          console.error('[Employees] Unexpected response shape from /employees', response);
          return [];
        }),
      );
  }

  getDepartments(): Observable<DepartmentDto[]> {
    const params = new HttpParams()
      .set('page', '0')
      .set('size', '1000')
      .set('sort', 'departmentId,asc');

    return this.http
      .get<PageResponse<DepartmentDto> | DepartmentDto[] | { content?: DepartmentDto[]; items?: DepartmentDto[]; data?: DepartmentDto[] }>(
        this.departmentsUrl,
        { params }
      )
      .pipe(
        map(response => {
          if (Array.isArray(response)) return response;
          if ((response as PageResponse<DepartmentDto>).items && Array.isArray((response as PageResponse<DepartmentDto>).items)) {
            return (response as PageResponse<DepartmentDto>).items;
          }
          if (response?.content && Array.isArray(response.content)) return response.content;
          if (response?.items && Array.isArray(response.items)) return response.items;
          if (response?.data && Array.isArray(response.data)) return response.data;
          return [];
        }),
      );
  }

  getById(id: number): Observable<EmployeeDto> {
    return this.http.get<EmployeeDto>(`${this.baseUrl}/${id}`);
  }

  create(request: EmployeeRequest): Observable<EmployeeDto> {
    return this.http.post<EmployeeDto>(this.baseUrl, request);
  }

  update(id: number, request: EmployeeRequest): Observable<EmployeeDto> {
    return this.http.put<EmployeeDto>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getPage(page: number = 1, size: number = 10, sortBy?: string, sortDir?: string): Observable<PageResponse<EmployeeDto>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy || 'employee_id')
      .set('sortDir', sortDir || 'asc');

    return this.http.get<PageResponse<EmployeeDto>>(`${this.baseUrl}/page`, { params });
  }

  searchByName(name: string, page: number = 1, size: number = 10, sortBy?: string, sortDir?: string): Observable<PageResponse<EmployeeDto>> {
    const params = new HttpParams()
      .set('name', name)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy || 'employee_id')
      .set('sortDir', sortDir || 'asc');

    return this.http.get<PageResponse<EmployeeDto>>(`${this.baseUrl}/search`, { params });
  }

  exportEmployees(): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.exportsUrl}/employees`, {
      observe: 'response',
      responseType: 'blob',
    });
  }

  getAllRoles(): Observable<RoleResponse[]> {
    return this.http.get<RoleResponse[]>(this.rolesUrl);
  }

  getEmployeeRoles(employeeId: number): Observable<RoleResponse[]> {
    return this.http.get<RoleResponse[]>(`${this.baseUrl}/${employeeId}/roles`);
  }

  assignRoleToEmployee(employeeId: number, roleId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/${employeeId}/roles`, { roleId });
  }

  removeRoleFromEmployee(employeeId: number, roleId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${employeeId}/roles/${roleId}`);
  }
}
