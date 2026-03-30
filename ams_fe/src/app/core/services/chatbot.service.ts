import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ChatbotRequest {
  message: string;
  session_id: string;
  locale: string;
}

export interface ChatbotResponse {
  success: boolean;
  message: string;
  data: Record<string, any>;
  trace_id: string;
  latency_ms: number;
  suggestions: string[];
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly baseUrl = environment.chatbotApiBaseUrl;
  private sessionId: string;

  constructor(private http: HttpClient) {
    this.sessionId = this.getOrCreateSessionId();
  }

  sendMessage(message: string): Observable<ChatbotResponse> {
    const body: ChatbotRequest = {
      message,
      session_id: this.sessionId,
      locale: 'vi',
    };
    return this.http.post<ChatbotResponse>(`${this.baseUrl}/chat`, body).pipe(
      timeout(30000),
      catchError((err) => {
        if (err.name === 'TimeoutError') {
          return throwError(() => ({
            status: 0,
            message: 'Hệ thống phản hồi quá lâu. Vui lòng thử lại.',
          }));
        }
        return throwError(() => err);
      }),
    );
  }

  private getOrCreateSessionId(): string {
    const key = 'ams.chatbot.sessionId';
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, id);
    }
    return id;
  }

  resetSession(): void {
    const key = 'ams.chatbot.sessionId';
    localStorage.removeItem(key);
    this.sessionId = this.getOrCreateSessionId();
  }
}
