import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api.endpoints';
import { EmployeeDto, EmployeePageQuery, EmployeeRequest, PageResponse } from './employee.model';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  constructor(private apiService: ApiService) {}

  getAll(): Observable<EmployeeDto[]> {
    return this.apiService.get<EmployeeDto[]>(API_ENDPOINTS.EMPLOYEES);
  }

  getPage(query: EmployeePageQuery): Observable<PageResponse<EmployeeDto>> {
    const queryString = this.toQueryString({
      page: query.page,
      size: query.size,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    });
    return this.apiService.get<PageResponse<EmployeeDto>>(
      `${API_ENDPOINTS.EMPLOYEES_PAGE}${queryString}`
    );
  }

  searchByName(
    name: string,
    query: EmployeePageQuery
  ): Observable<PageResponse<EmployeeDto>> {
    const queryString = this.toQueryString({
      name,
      page: query.page,
      size: query.size,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    });
    return this.apiService.get<PageResponse<EmployeeDto>>(
      `${API_ENDPOINTS.EMPLOYEES_SEARCH}${queryString}`
    );
  }

  getById(id: number): Observable<EmployeeDto> {
    return this.apiService.get<EmployeeDto>(`${API_ENDPOINTS.EMPLOYEES}/${id}`);
  }

  create(payload: EmployeeRequest): Observable<EmployeeDto> {
    return this.apiService.post<EmployeeDto>(API_ENDPOINTS.EMPLOYEES, payload);
  }

  update(id: number, payload: EmployeeRequest): Observable<EmployeeDto> {
    return this.apiService.put<EmployeeDto>(`${API_ENDPOINTS.EMPLOYEES}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.apiService.delete<void>(`${API_ENDPOINTS.EMPLOYEES}/${id}`);
  }

  private toQueryString(params: Record<string, string | number | undefined>): string {
    const entries = Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    );
    if (entries.length === 0) {
      return '';
    }
    const query = entries
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    return `?${query}`;
  }
}
