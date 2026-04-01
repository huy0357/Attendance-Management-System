import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { asyncScheduler, catchError, finalize, of, Subject, takeUntil } from 'rxjs';
import { observeOn } from 'rxjs/operators';
import { ChatbotService } from '../../../features/chatbot/chatbot.service';
import { ChatMessage, ChatResponse } from '../../../features/chatbot/chatbot.model';
import { formatIsoTimestampsInText } from '../../../features/chatbot/format-chat-content';
import { AuthService } from '../../auth/auth.service';

@Component({
  standalone: false,
  selector: 'app-ai-chatbot',
  templateUrl: './ai-chatbot.component.html',
  styleUrls: ['./ai-chatbot.component.scss'],
  providers: [DatePipe],
})
export class AiChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLElement>;

  isOpen = false;
  isTyping = false;
  inputText = '';
  messages: ChatMessage[] = [];
  chatbotOnline = true;

  private readonly sessionId = crypto.randomUUID();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private chatbotService: ChatbotService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private datePipe: DatePipe,
  ) {}

  ngOnInit(): void {
    this.messages.push({
      id: crypto.randomUUID(),
      sender: 'ai',
      content: 'Xin chào! Tôi là AMS AI Assistant. Tôi có thể giúp bạn tra cứu thông tin chấm công, nghỉ phép và các quy định của công ty. Bạn cần hỗ trợ gì?',
      timestamp: new Date(),
      suggestions: ['Xem chấm công hôm nay', 'Số ngày phép còn lại', 'Chính sách làm thêm giờ'],
    });

    this.chatbotService.checkHealth().pipe(
      takeUntil(this.destroy$),
      catchError(() => {
        this.chatbotOnline = false;
        this.messages.push({
          id: crypto.randomUUID(),
          sender: 'ai',
          content: 'Dịch vụ chatbot hiện chưa sẵn sàng. Bạn có thể thử lại sau ít phút.',
          timestamp: new Date(),
          suggestions: [],
        });
        this.cdr.detectChanges();
        return of({ status: 'down' });
      }),
    ).subscribe((res) => {
      this.chatbotOnline = res.status === 'ok';
      this.cdr.detectChanges();
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
    console.log('[AiChatbot] sendMessage enter', { content, isTyping: this.isTyping, chatbotOnline: this.chatbotOnline });
    if (!content || this.isTyping) return;

    this.messages.push({
      id: crypto.randomUUID(),
      sender: 'user',
      content,
      timestamp: new Date(),
    });
    this.inputText = '';
    this.isTyping = true;
    this.cdr.detectChanges();
    this.scheduleScrollToBottom();

    const token = this.authService.getAccessToken();

    console.log('[AiChatbot] Sending message:', content);

    this.chatbotService
      .sendMessageByBackendFlow(
        { message: content, session_id: this.sessionId, locale: 'vi' },
        token,
      )
      .pipe(
        takeUntil(this.destroy$),
        observeOn(asyncScheduler),
        finalize(() => {
          this.isTyping = false;
          this.cdr.detectChanges();
          this.scheduleScrollToBottom();
        }),
      )
      .subscribe({
        next: (response: ChatResponse) => {
          console.log('[AiChatbot] Response (next):', response);
          const raw = response.message ?? '';
          let display: string;
          try {
            display = formatIsoTimestampsInText(raw, this.datePipe);
          } catch {
            display = raw;
          }
          this.messages.push({
            id: crypto.randomUUID(),
            sender: 'ai',
            content: display,
            timestamp: new Date(),
            suggestions: response.suggestions ?? [],
          });
          this.cdr.detectChanges();
          this.scheduleScrollToBottom();
        },
        error: (err: unknown) => {
          console.error('[AiChatbot] Chat HTTP error (subscribe.error):', err);
          this.messages.push({
            id: crypto.randomUUID(),
            sender: 'ai',
            content: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.',
            timestamp: new Date(),
            suggestions: [],
          });
          this.cdr.detectChanges();
          this.scheduleScrollToBottom();
        },
      });
  }

  private scheduleScrollToBottom(): void {
    requestAnimationFrame(() => {
      setTimeout(() => this.scrollToBottom(), 0);
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
