import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatRequest, ChatResponse } from './chatbot.model';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly chatbotBaseUrl = 'http://localhost:8088/api/v1';

  constructor(private http: HttpClient) {}

  sendMessage(payload: ChatRequest, token?: string | null): Observable<ChatResponse> {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.post<ChatResponse>(`${this.chatbotBaseUrl}/chat`, payload, { headers });
  }
}
