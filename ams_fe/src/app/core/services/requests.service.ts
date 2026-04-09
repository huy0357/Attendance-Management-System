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
import { PageResponse, SpringPage } from '../../shared/models/page-response.model';

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
    return this.submitRequestByEmployee(id, null);
  }

  submitRequestByEmployee(id: number, employeeId: number | null): Observable<RequestsResponse> {
    let params = new HttpParams();
    if (employeeId && employeeId > 0) {
      params = params.set('employeeId', employeeId.toString());
    }
    return this.http.put<RequestsResponse>(`${this.baseUrl}/${id}/submit`, null, { params });
  }

  getMyRequests(
    employeeId: number,
    status?: RequestsResponse['status'] | '',
    requestType?: RequestsResponse['requestType'] | '',
  ): Observable<RequestsResponse[]> {
    let params = new HttpParams().set('employeeId', employeeId.toString());
    if (status) {
      params = params.set('status', status);
    }
    if (requestType) {
      params = params.set('type', requestType);
    }
    return this.http.get<RequestsResponse[] | PageResponse<RequestsResponse> | SpringPage<RequestsResponse>>(this.baseUrl, { params }).pipe(
      map((response) => this.normalizeRequestsList(response)),
    );
  }

  getRequestsByEmployee(
    employeeId: number,
    status?: RequestsResponse['status'] | '',
    requestType?: RequestsResponse['requestType'] | '',
  ): Observable<RequestsResponse[]> {
    return this.getMyRequests(employeeId, status, requestType);
  }

  getManagerQueue(
    managerId: number,
    status?: RequestsResponse['status'] | '',
    requestType?: RequestsResponse['requestType'] | '',
  ): Observable<RequestsResponse[]> {
    let params = new HttpParams().set('managerId', managerId.toString());
    if (status) params = params.set('status', status);
    if (requestType) params = params.set('type', requestType);
    return this.http.get<RequestsResponse[] | PageResponse<RequestsResponse> | SpringPage<RequestsResponse>>(`${this.baseUrl}/manager-queue`, { params }).pipe(
      map((response) => this.normalizeRequestsList(response)),
    );
  }

  getAllGlobal(
    status?: RequestsResponse['status'] | '',
    requestType?: RequestsResponse['requestType'] | '',
  ): Observable<RequestsResponse[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (requestType) params = params.set('type', requestType);
    return this.http.get<RequestsResponse[] | PageResponse<RequestsResponse> | SpringPage<RequestsResponse>>(`${this.baseUrl}/all`, { params }).pipe(
      map((response) => this.normalizeRequestsList(response)),
    );
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
          .filter((request) => request.requestType?.toUpperCase() === 'LEAVE')
          .map((request) => this.mapRequestToLeave(request)),
      ),
    );
  }

  updateRequest(id: number, payload: RequestsUpsertRequest): Observable<RequestsResponse> {
    const params = new HttpParams().set('employeeId', payload.employeeId.toString());
    return this.http.put<RequestsResponse>(`${this.baseUrl}/${id}`, this.cleanPayload(payload), { params });
  }

  deleteRequest(id: number, employeeId: number): Observable<void> {
    const params = new HttpParams().set('employeeId', employeeId.toString());
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { params });
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

  private normalizeRequestsList(
    response: RequestsResponse[] | PageResponse<RequestsResponse> | SpringPage<RequestsResponse> | null | undefined,
  ): RequestsResponse[] {
    if (Array.isArray(response)) {
      return response;
    }

    const responseAsRecord = response as {
      items?: unknown;
      content?: unknown;
    } | null;

    if (Array.isArray(responseAsRecord?.items)) {
      return responseAsRecord.items as RequestsResponse[];
    }

    if (Array.isArray(responseAsRecord?.content)) {
      return responseAsRecord.content as RequestsResponse[];
    }

    return [];
  }
}
