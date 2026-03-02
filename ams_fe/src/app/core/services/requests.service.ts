import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RequestsApprovalRequest,
  RequestsResponse,
  RequestsUpsertRequest,
} from '../../shared/models/requests.model';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class RequestsService {
  private readonly baseUrl = `${environment.apiBaseUrl}/requests`;

  constructor(private http: HttpClient) { }

  createRequest(payload: RequestsUpsertRequest): Observable<RequestsResponse> {
    return this.http.post<RequestsResponse>(this.baseUrl, this.cleanPayload(payload));
  }

  submitRequest(id: number): Observable<RequestsResponse> {
    return this.http.put<RequestsResponse>(`${this.baseUrl}/${id}/submit`, null);
  }

  getMyRequests(employeeId: number): Observable<RequestsResponse[]> {
    const params = new HttpParams().set('employeeId', employeeId.toString());
    return this.http.get<RequestsResponse[]>(this.baseUrl, { params });
  }

  getOvertimeRequests(employeeId: number): Observable<RequestsResponse[]> {
    return this.getMyRequests(employeeId).pipe(
      map((requests) => requests.filter((request) => request.requestType === 'OVERTIME')),
    );
  }

  updateRequest(id: number, payload: RequestsUpsertRequest): Observable<RequestsResponse> {
    return this.http.put<RequestsResponse>(`${this.baseUrl}/${id}`, this.cleanPayload(payload));
  }

  deleteRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  approveOrReject(id: number, payload: RequestsApprovalRequest): Observable<RequestsResponse> {
    return this.http.put<RequestsResponse>(`${this.baseUrl}/${id}/approval`, this.cleanPayload(payload));
  }

  private cleanPayload<T extends object>(payload: T): Partial<T> {
    const cleaned: Partial<T> = {};

    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (value !== undefined) {
        (cleaned as Record<string, unknown>)[key] = value;
      }
    }

    return cleaned;
  }
}
