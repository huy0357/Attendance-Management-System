export type MessageSender = 'user' | 'ai';

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export interface ChatRequest {
  message: string;
  session_id: string;
  locale?: string;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  data: Record<string, unknown>;
  trace_id: string;
  latency_ms: number;
  suggestions: string[];
}
