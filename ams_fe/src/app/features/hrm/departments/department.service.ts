import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DepartmentDto, DepartmentRequest } from '../../../shared/models/department.model';
import { PageResponse } from '../../../shared/models/page-response.model';
import { environment } from '../../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class DepartmentService {
    private readonly apiUrl = `${environment.apiBaseUrl}/departments`;

    constructor(private http: HttpClient) { }

    getAll(
        page: number = 1,
        size: number = 10,
        keyword: string = '',
        sortBy: string = 'departmentId',
        sortDir: 'asc' | 'desc' = 'asc'
    ): Observable<PageResponse<DepartmentDto>> {
        let params = new HttpParams()
            .set('page', (page - 1).toString()) // Backend uses 0-based page index
            .set('size', size.toString())
            .set('sortBy', sortBy)
            .set('direction', sortDir.toUpperCase());

        if (keyword) {
            params = params.set('keyword', keyword);
        }

        return this.http.get<any>(this.apiUrl, { params }).pipe(
            map(response => {
                // Map Backend Page<DepartmentDto> to Frontend PageResponse<DepartmentDto>
                // Backend Page: { content: [], totalElements: 0, totalPages: 0, ... }
                // Frontend PageResponse: { items: [], totalItems: 0, totalPages: 0, ... }
                return {
                    items: response.content || [],
                    totalItems: response.totalElements || 0,
                    totalPages: response.totalPages || 0,
                    page: (response.number || 0) + 1, // Convert back to 1-based for frontend
                    size: response.size || size,
                    hasNext: !response.last,
                    hasPrev: !response.first
                } as PageResponse<DepartmentDto>;
            })
        );
    }

    getById(id: number): Observable<DepartmentDto> {
        return this.http.get<DepartmentDto>(`${this.apiUrl}/${id}`);
    }

    create(request: DepartmentRequest): Observable<DepartmentDto> {
        return this.http.post<DepartmentDto>(this.apiUrl, request);
    }

    update(id: number, request: DepartmentRequest): Observable<DepartmentDto> {
        return this.http.put<DepartmentDto>(`${this.apiUrl}/${id}`, request);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    getTree(): Observable<DepartmentDto[]> {
        return this.http.get<DepartmentDto[]>(`${this.apiUrl}/tree`);
    }
}
