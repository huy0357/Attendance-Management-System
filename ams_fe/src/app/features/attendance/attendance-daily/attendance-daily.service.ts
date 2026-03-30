import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AttendanceDailyResponse } from '../models/attendance-daily.model';
import { SpringPage } from '../../../shared/models/page-response.model';

@Injectable({ providedIn: 'root' })
export class AttendanceDailyService {
  private readonly attendanceDailyUrl = `${environment.apiBaseUrl}/attendance-daily`;

  constructor(private http: HttpClient) {}

  getAttendanceDailyAdmin(from: string, to: string, page: number, size: number): Observable<SpringPage<AttendanceDailyResponse>> {
    return this.http.get<SpringPage<AttendanceDailyResponse>>(`${this.attendanceDailyUrl}/admin`, {
      params: this.buildParams(from, to, page, size),
    });
  }

  getMyAttendanceDaily(from: string, to: string, page: number, size: number): Observable<SpringPage<AttendanceDailyResponse>> {
    return this.http.get<SpringPage<AttendanceDailyResponse>>(`${this.attendanceDailyUrl}/me`, {
      params: this.buildParams(from, to, page, size),
    });
  }

  private buildParams(from: string, to: string, page: number, size: number): HttpParams {
    return new HttpParams()
      .set('from', this.normalizeDateParam(from))
      .set('to', this.normalizeDateParam(to))
      .set('page', Math.max(0, page).toString())
      .set('size', Math.max(1, size).toString());
  }

  private normalizeDateParam(value: string): string {
    return String(value ?? '').trim();
  }
}
