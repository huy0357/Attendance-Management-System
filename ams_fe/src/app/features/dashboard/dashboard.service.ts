import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/auth/auth.service';
import {
  DashboardKpiResponse,
  LivePulseResponse,
  ExceptionsResponse,
  AttendanceDailyPage,
} from '../../shared/models/dashboard.model';

export interface ResolveExceptionPayload {
  notes: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly baseUrl = `${environment.apiBaseUrl}/v1/dashboard`;
  private readonly attendanceUrl = `${environment.apiBaseUrl}/attendance-daily`;

  constructor(private http: HttpClient) {}

  /**
   * GET /api/v1/dashboard/kpi
   * Returns ApiResponse<DashboardKpiResponse>
   */
  getKpi(date?: string, branchIds?: string[], timezone = 'Asia/Ho_Chi_Minh'): Observable<DashboardKpiResponse> {
    let params = new HttpParams().set('timezone', timezone);
    if (date) params = params.set('date', date);
    if (branchIds?.length) branchIds.forEach(id => (params = params.append('branchIds', id)));

    return this.http
      .get<ApiResponse<DashboardKpiResponse>>(`${this.baseUrl}/kpi`, { params })
      .pipe(map(res => res.data));
  }

  /**
   * GET /api/v1/dashboard/live-pulse
   * Returns ApiResponse<LivePulseResponse>
   */
  getLivePulse(limit = 20, includeCheckOut = false, branchIds?: string[]): Observable<LivePulseResponse> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('includeCheckOut', includeCheckOut.toString());
    if (branchIds?.length) branchIds.forEach(id => (params = params.append('branchIds', id)));

    return this.http
      .get<ApiResponse<LivePulseResponse>>(`${this.baseUrl}/live-pulse`, { params })
      .pipe(map(res => res.data));
  }

  /**
   * GET /api/v1/dashboard/exceptions
   * Returns ApiResponse<ExceptionsResponse>
   */
  getExceptions(
    status?: string[],
    severity?: string[],
    branchIds?: string[],
    limit = 50,
    offset = 0,
  ): Observable<ExceptionsResponse> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString())
      .set('sortBy', 'occurrenceTime')
      .set('sortOrder', 'DESC');
    if (status?.length) status.forEach(s => (params = params.append('status', s)));
    if (severity?.length) severity.forEach(s => (params = params.append('severity', s)));
    if (branchIds?.length) branchIds.forEach(id => (params = params.append('branchIds', id)));

    return this.http
      .get<ApiResponse<ExceptionsResponse>>(`${this.baseUrl}/exceptions`, { params })
      .pipe(map(res => res.data));
  }

  /**
   * POST /api/v1/dashboard/exceptions/{exceptionId}/resolve
   * Returns ApiResponse<void>
   */
  resolveException(exceptionId: number, notes: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/exceptions/${exceptionId}/resolve`, { notes })
      .pipe(map(() => void 0));
  }

  /**
   * GET /api/attendance-daily/admin
   * Returns Page<AttendanceDailyRecord> (raw Spring Data page — NOT wrapped in ApiResponse)
   */
  getAdminAttendance(from: string, to: string, page = 0, size = 20): Observable<AttendanceDailyPage> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<AttendanceDailyPage>(`${this.attendanceUrl}/admin`, { params });
  }

  /**
   * GET /api/attendance-daily/me
   * Returns Page<AttendanceDailyRecord>
   */
  getMyAttendance(from: string, to: string, page = 0, size = 20): Observable<AttendanceDailyPage> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<AttendanceDailyPage>(`${this.attendanceUrl}/me`, { params });
  }
}
