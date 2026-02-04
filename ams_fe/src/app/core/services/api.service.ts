import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:8080/api'; // Must match Cypress intercepts

  constructor(
    private http: HttpClient,
    private storageService: StorageService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.storageService.getAccessToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    });
  }

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders(),
    });
  }

  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body, {
      headers: this.getHeaders(),
    });
  }

  put<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body, {
      headers: this.getHeaders(),
    });
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders(),
    });
  }
}
