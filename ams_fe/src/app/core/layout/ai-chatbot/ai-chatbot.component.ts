import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  NgZone,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { ChatbotService, ChatbotResponse } from '../../services/chatbot.service';
import { AuthService } from '../../auth/auth.service';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'loading' | 'error';
  content: string;
  timestamp: Date;
}

@Component({
  standalone: false,
  selector: 'app-ai-chatbot',
  templateUrl: './ai-chatbot.component.html',
  styleUrls: ['./ai-chatbot.component.scss'],
})
export class AiChatbotComponent implements OnInit, AfterViewChecked {
  @Output() close = new EventEmitter<void>();
  @ViewChild('messagesEnd') messagesEnd?: ElementRef<HTMLDivElement>;

  messages: Message[] = [];
  input = '';
  isLoading = false;
  private shouldScroll = false;

  suggestions = [
    'Hôm nay tôi làm ca gì?',
    'Quy định nghỉ phép như thế nào?',
    'Tôi đã chấm công hôm nay chưa?',
    'Nội quy công ty',
  ];

  constructor(
    private chatbotService: ChatbotService,
    private authService: AuthService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const username = this.authService.getUsername() || 'bạn';
    this.messages = [
      {
        id: '1',
        type: 'ai',
        content: `Xin chào ${username}! Mình là trợ lý AI của hệ thống chấm công. Bạn có thể hỏi mình về ca làm việc, điểm danh, nội quy công ty, và nhiều hơn nữa!`,
        timestamp: new Date(),
      },
    ];
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  handleSend(): void {
    if (!this.input.trim() || this.isLoading) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: this.input,
      timestamp: new Date(),
    };

    this.messages = [...this.messages, userMessage];
    const userText = this.input;
    this.input = '';
    this.isLoading = true;
    this.shouldScroll = true;

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'loading',
      content: 'Đang xử lý...',
      timestamp: new Date(),
    };
    this.messages = [...this.messages, loadingMessage];

    this.chatbotService.sendMessage(userText).subscribe({
      next: (response: ChatbotResponse) => {
        this.ngZone.run(() => {
          const aiMessage: Message = {
            id: (Date.now() + 2).toString(),
            type: 'ai',
            content: response.message,
            timestamp: new Date(),
          };
          this.messages = this.messages
            .filter(msg => msg.type !== 'loading')
            .concat(aiMessage);
          this.isLoading = false;
          this.shouldScroll = true;

          if (response.suggestions && response.suggestions.length > 0) {
            this.suggestions = response.suggestions;
          }
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          const errorMessage: Message = {
            id: (Date.now() + 2).toString(),
            type: 'error',
            content: err.status === 0
              ? 'Không thể kết nối đến server chatbot. Vui lòng kiểm tra lại.'
              : `Lỗi: ${err.error?.message || err.message || 'Đã xảy ra lỗi không xác định.'}`,
            timestamp: new Date(),
          };
          this.messages = this.messages
            .filter(msg => msg.type !== 'loading')
            .concat(errorMessage);
          this.isLoading = false;
          this.shouldScroll = true;
          this.cdr.detectChanges();
        });
      },
    });
  }

  handleSuggestionClick(suggestion: string): void {
    this.input = suggestion;
    this.handleSend();
  }

  handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.handleSend();
    }
  }

  private scrollToBottom(): void {
    this.messagesEnd?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }
}
