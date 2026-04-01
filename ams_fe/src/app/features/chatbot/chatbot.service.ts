import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ChatRequest, ChatResponse } from './chatbot.model';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly chatbotBaseUrl = environment.chatbotApiBaseUrl;

  constructor(private http: HttpClient) {}

  checkHealth(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.chatbotBaseUrl}/health`).pipe(
      timeout(10000),
    );
  }

  sendMessage(payload: ChatRequest, token?: string | null): Observable<ChatResponse> {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    if (token) {
      const authValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      headers = headers.set('Authorization', authValue);
    }

    return this.http.post<ChatResponse>(`${this.chatbotBaseUrl}/api/v1/chat`, payload, { headers }).pipe(
      timeout(30000),
    );
  }

  /** Gọi API chat trực tiếp (không check /health trước mỗi tin để tránh tăng độ trễ). */
  sendMessageByBackendFlow(payload: ChatRequest, token?: string | null): Observable<ChatResponse> {
    return this.sendMessage(payload, token);
  }
}
