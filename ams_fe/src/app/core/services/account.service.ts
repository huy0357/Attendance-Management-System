import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AccountDto } from '../../shared/models/account.model';
import { PageResponse } from '../../shared/models/page-response.model';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly baseUrl = `${environment.apiBaseUrl}/accounts`;

  constructor(private http: HttpClient) { }

  findByUsername(username: string): Observable<AccountDto | null> {
    const params = new HttpParams()
      .set('username', username)
      .set('page', '1')
      .set('size', '1')
      .set('sortBy', 'accountId')
      .set('sortDir', 'desc');

    return this.http.get<PageResponse<AccountDto>>(`${this.baseUrl}/search`, { params }).pipe(
      map((response) => response.items?.[0] ?? null),
    );
  }
}
