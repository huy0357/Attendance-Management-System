import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuditLog, AuditLogFilter, PageResponse } from './audit-log.model';

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private readonly baseUrl = `${environment.apiBaseUrl}/audit-logs`;

  constructor(private http: HttpClient) {}

  getAuditLogs(filter: AuditLogFilter): Observable<PageResponse<AuditLog>> {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('size', filter.size.toString())
      .set('sortBy', filter.sortBy || 'createdAt')
      .set('sortDir', filter.sortDir || 'desc');

    if (filter.entityType) {
      params = params.set('entityType', filter.entityType);
    }
    if (filter.action) {
      params = params.set('action', filter.action);
    }
    if (filter.actorId !== undefined && filter.actorId !== null) {
      params = params.set('actorId', filter.actorId.toString());
    }

    return this.http.get<PageResponse<AuditLog>>(this.baseUrl, { params });
  }

  getAuditLogDetail(id: number): Observable<AuditLog> {
    return this.http.get<AuditLog>(`${this.baseUrl}/${id}`);
  }
}
