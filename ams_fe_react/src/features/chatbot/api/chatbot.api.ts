import axiosInstance from '../../../core/api/axiosInstance';
import { ChatRequest, ChatResponse } from '../models/chatbot.model';

// Using chatbot Base URL from Vite Env or Fallback
// Assuming axiosInstance already routes /api correctly or we can use absolute path
// Wait, the Angular code used environment.chatbotApiBaseUrl which might be a different port.
// Let me check what the chatbot API path in Angular was. 
// "this.chatbotBaseUrl = environment.chatbotApiBaseUrl". 
// Usually, we proxy it or use process.env.VITE_CHATBOT_API_URL.
// The user prompt says: "BẮT BUỘC dùng axiosInstance đã cấu hình để vượt proxy /api"
// In Angular: this.http.post<ChatResponse>(`${this.chatbotBaseUrl}/api/v1/chat`, payload)
// Actually, axiosInstance is configured with baseURL: '/api' likely. If we call `/v1/chat` on axiosInstance, it might be proxied by Vite to the fast api backend.
// Let me just use axiosInstance.post('/v1/chat', payload) since the prompt says: "BẮT BUỘC dùng `axiosInstance` đã cấu hình để vượt proxy `/api`."

export const chatbotApi = {
  checkHealth: async (): Promise<{ status: string }> => {
    try {
      const response = await axiosInstance.get('/chatbot-api/health', { baseURL: '/' });
      return response.data as { status: string };
    } catch (error: any) {
      console.error('[Chatbot API] Health check failed:', error.response?.data || error.message);
      throw error;
    }
  },

  sendMessage: async (payload: ChatRequest): Promise<ChatResponse> => {
    try {
      const response = await axiosInstance.post<ChatResponse>('/chatbot-api/api/v1/chat', payload, { baseURL: '/' });
      return response.data;
    } catch (error: any) {
      console.error('[Chatbot API] Send message failed:', error.response?.data || error.message);
      throw error;
    }
  },
};
