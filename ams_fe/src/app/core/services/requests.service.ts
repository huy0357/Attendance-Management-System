import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RequestsApprovalRequest,
  RequestsResponse,
  RequestsUpsertRequest,
} from '../../shared/models/requests.model';
import { map, switchMap } from 'rxjs/operators';
import { ProfileService } from './profile.service';

export interface LeaveRequest {
  requestId: number;
  employeeId: number;
  employeeName: string;
  title: string;
  startDatetime: string;
  endDatetime: string;
  days: number;
  reason: string;
  status: RequestsResponse['status'];
  submittedAt?: string;
  approverName?: string;
  decisionNote?: string;
}

@Injectable({ providedIn: 'root' })
export class RequestsService {
  private readonly baseUrl = `${environment.apiBaseUrl}/requests`;

  constructor(
    private readonly http: HttpClient,
    private readonly profileService: ProfileService,
  ) { }

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

  getRequestsByEmployee(employeeId: number): Observable<RequestsResponse[]> {
    return this.getMyRequests(employeeId);
  }

  getOvertimeRequests(employeeId: number): Observable<RequestsResponse[]> {
    return this.getMyRequests(employeeId).pipe(
      map((requests) => requests.filter((request) => request.requestType === 'OVERTIME')),
    );
  }

  getLeaveRequestsForCurrentEmployee(): Observable<LeaveRequest[]> {
    return this.profileService.resolveEmployeeIdFromAuthContext().pipe(
      // Keep the request domain centralized here; components no longer use AttendanceService for request data.
      switchMap((employeeId) => this.getRequestsByEmployee(employeeId)),
      map((requests) =>
        requests
          .filter((request) => request.requestType === 'LEAVE')
          .map((request) => this.mapRequestToLeave(request)),
      ),
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

  resolveEmployeeIdFromAuthContext(): Observable<number> {
    return this.profileService.resolveEmployeeIdFromAuthContext();
  }

  private mapRequestToLeave(request: RequestsResponse): LeaveRequest {
    return {
      requestId: request.requestId,
      employeeId: request.employeeId ?? 0,
      employeeName: request.employeeName ?? '',
      title: request.title ?? 'Leave request',
      startDatetime: request.startDatetime ?? '',
      endDatetime: request.endDatetime ?? '',
      days: this.calculateDays(request.startDatetime, request.endDatetime),
      reason: request.reason ?? '',
      status: request.status,
      submittedAt: request.submittedAt ?? undefined,
      approverName: request.approverName ?? undefined,
      decisionNote: request.decisionNote ?? undefined,
    };
  }

  private calculateDays(start?: string | null, end?: string | null): number {
    if (!start || !end) {
      return 0;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 0;
    }
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs < 0) {
      return 0;
    }
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
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
