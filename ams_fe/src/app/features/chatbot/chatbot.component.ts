import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of, Subject, takeUntil } from 'rxjs';
import { ChatbotService } from './chatbot.service';
import { ChatMessage } from './chatbot.model';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss'],
})
export class ChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLElement>;

  isOpen = false;
  isTyping = false;
  inputText = '';
  messages: ChatMessage[] = [];

  private readonly sessionId = crypto.randomUUID();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private chatbotService: ChatbotService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    // Welcome message
    this.messages.push({
      id: crypto.randomUUID(),
      sender: 'ai',
      content: 'Xin chào! Tôi là AMS AI Assistant. Tôi có thể giúp bạn tra cứu thông tin chấm công, nghỉ phép và các quy định của công ty. Bạn cần hỗ trợ gì?',
      timestamp: new Date(),
      suggestions: ['Xem chấm công hôm nay', 'Số ngày phép còn lại', 'Chính sách làm thêm giờ'],
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 50);
    }
  }

  closeChat(): void {
    this.isOpen = false;
  }

  sendMessage(text?: string): void {
    const content = (text ?? this.inputText).trim();
    if (!content || this.isTyping) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);
    this.inputText = '';
    this.isTyping = true;
    setTimeout(() => this.scrollToBottom(), 50);

    const token = this.authService.getAccessToken();

    this.chatbotService.sendMessage(
      { message: content, session_id: this.sessionId, locale: 'vi' },
      token,
    ).pipe(
      takeUntil(this.destroy$),
      catchError(() => of({
        success: false,
        message: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.',
        data: {},
        trace_id: '',
        latency_ms: 0,
        suggestions: [],
      })),
      finalize(() => {
        this.isTyping = false;
        setTimeout(() => this.scrollToBottom(), 50);
      }),
    ).subscribe(response => {
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        content: response.message,
        timestamp: new Date(),
        suggestions: response.suggestions ?? [],
      };
      this.messages.push(aiMsg);
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  trackByMessage(index: number, msg: ChatMessage): string {
    return msg.id;
  }

  private scrollToBottom(): void {
    if (this.messagesContainer?.nativeElement) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
