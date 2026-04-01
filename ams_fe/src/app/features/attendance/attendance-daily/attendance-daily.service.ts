import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, from as rxFrom } from 'rxjs';
import { concatMap, toArray } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AttendanceDailyResponse } from '../models/attendance-daily.model';
import { SpringPage } from '../../../shared/models/page-response.model';

export interface AdminAttendanceBatchResponse {
  message: string;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class AttendanceDailyService {
  private readonly attendanceDailyUrl = `${environment.apiBaseUrl}/attendance-daily`;
  private readonly adminAttendanceUrl = `${environment.apiBaseUrl}/admin/attendance`;

  private readonly noCacheHeaders = new HttpHeaders({
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  });

  constructor(private http: HttpClient) {}

  getAttendanceDailyAdmin(from: string, to: string, page: number, size: number): Observable<SpringPage<AttendanceDailyResponse>> {
    const params = this.buildParams(from, to, page, size);
    return this.http.get<SpringPage<AttendanceDailyResponse>>(`${this.attendanceDailyUrl}/admin`, {
      params,
      headers: this.noCacheHeaders,
    });
  }

  getMyAttendanceDaily(from: string, to: string, page: number, size: number): Observable<SpringPage<AttendanceDailyResponse>> {
    const params = this.buildParams(from, to, page, size);
    return this.http.get<SpringPage<AttendanceDailyResponse>>(`${this.attendanceDailyUrl}/me`, {
      params,
      headers: this.noCacheHeaders,
    });
  }

  private buildParams(from: string, to: string, page: number, size: number): HttpParams {
    return new HttpParams()
      .set('from', this.normalizeDateParam(from))
      .set('to', this.normalizeDateParam(to))
      .set('page', Math.max(0, page).toString())
      .set('size', Math.max(1, size).toString())
      .set('_t', `${Date.now()}`);
  }

  private normalizeDateParam(value: string): string {
    return String(value ?? '').trim();
  }

  /**
   * POST /api/admin/attendance/run-batch?date=YYYY-MM-DD — tính lại attendance_daily cho một ngày.
   */
  runAttendanceBatchForDate(date: string): Observable<AdminAttendanceBatchResponse> {
    const params = new HttpParams().set('date', this.normalizeDateParam(date)).set('_t', `${Date.now()}`);
    return this.http.post<AdminAttendanceBatchResponse>(`${this.adminAttendanceUrl}/run-batch`, null, {
      params,
      headers: this.noCacheHeaders,
    });
  }

  /**
   * Chạy batch tuần tự cho mỗi ngày trong [from, to] (inclusive), cùng semantics LocalDate trên BE.
   */
  runAttendanceBatchForDateRange(from: string, to: string): Observable<AdminAttendanceBatchResponse[]> {
    const dates = AttendanceDailyService.enumerateIsoDatesInclusive(
      this.normalizeDateParam(from),
      this.normalizeDateParam(to),
    );
    return rxFrom(dates).pipe(
      concatMap((d) => this.runAttendanceBatchForDate(d)),
      toArray(),
    );
  }

  /** Số ngày lịch trong [from, to] (cùng inclusive). */
  countInclusiveDays(from: string, to: string): number {
    return AttendanceDailyService.enumerateIsoDatesInclusive(
      this.normalizeDateParam(from),
      this.normalizeDateParam(to),
    ).length;
  }

  private static enumerateIsoDatesInclusive(from: string, to: string): string[] {
    const [fy, fm, fd] = from.split('-').map(Number);
    const [ty, tm, td] = to.split('-').map(Number);
    const out: string[] = [];
    const cursor = new Date(fy, fm - 1, fd);
    const end = new Date(ty, tm - 1, td);
    while (cursor.getTime() <= end.getTime()) {
      const y = cursor.getFullYear();
      const month = `${cursor.getMonth() + 1}`.padStart(2, '0');
      const day = `${cursor.getDate()}`.padStart(2, '0');
      out.push(`${y}-${month}-${day}`);
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }
}
