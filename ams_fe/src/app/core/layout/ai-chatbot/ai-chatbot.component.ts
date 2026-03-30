import { AfterViewChecked, Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'loading';
  content: string;
  data?: any;
  timestamp: Date;
}

@Component({
  standalone: false,
  selector: 'app-ai-chatbot',
  templateUrl: './ai-chatbot.component.html',
  styleUrls: ['./ai-chatbot.component.scss'],
})
export class AiChatbotComponent implements AfterViewChecked {
  @Output() close = new EventEmitter<void>();
  @ViewChild('messagesEnd') messagesEnd?: ElementRef<HTMLDivElement>;

  messages: Message[] = [
    {
      id: '1',
      type: 'ai',
      content:
        "Hello! I'm your AI attendance assistant. I can help you with insights, analytics, and quick data lookups. Try asking me something!",
      timestamp: new Date(),
    },
  ];
  input = '';
  isLoading = false;
  private shouldScroll = false;

  suggestions = [
    'Who is late today?',
    'Show attendance trend last week',
    'List pending leave requests',
    'Department attendance comparison',
  ];

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
    this.input = '';
    this.isLoading = true;
    this.shouldScroll = true;

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'loading',
      content: 'Parsing question...',
      timestamp: new Date(),
    };
    this.messages = [...this.messages, loadingMessage];

    setTimeout(() => {
      this.messages = this.messages.map(msg =>
        msg.type === 'loading' ? { ...msg, content: 'Fetching attendance data...' } : msg,
      );
      this.shouldScroll = true;
    }, 800);

    setTimeout(() => {
      this.messages = this.messages.map(msg =>
        msg.type === 'loading' ? { ...msg, content: 'Summarizing results...' } : msg,
      );
      this.shouldScroll = true;
    }, 1600);

    setTimeout(() => {
      let response: Message;
      const query = userMessage.content.toLowerCase();

      if (query.includes('late')) {
        response = {
          id: (Date.now() + 2).toString(),
          type: 'ai',
          content: 'Here are the employees who checked in late today:',
          data: {
            type: 'table',
            rows: [
              { name: 'Michael Ross', time: '09:02:15', late: '2 min' },
              { name: 'Lisa Wong', time: '09:15:30', late: '15 min' },
              { name: 'James Kim', time: '09:08:45', late: '8 min' },
            ],
          },
          timestamp: new Date(),
        };
      } else if (query.includes('trend') || query.includes('week')) {
        response = {
          id: (Date.now() + 2).toString(),
          type: 'ai',
          content: "Here's the attendance trend for the last week:",
          data: {
            type: 'chart',
            values: [85, 92, 88, 90, 87, 84, 0],
          },
          timestamp: new Date(),
        };
      } else if (query.includes('leave') || query.includes('pending')) {
        response = {
          id: (Date.now() + 2).toString(),
          type: 'ai',
          content: 'There are 3 pending leave requests:',
          data: {
            type: 'list',
            items: [
              { name: 'Lisa Wong', type: 'Personal', days: '3 days', dates: 'Jan 20-22' },
              { name: 'David Kumar', type: 'Sick', days: '2 days', dates: 'Jan 18-19' },
              { name: 'Emma Wilson', type: 'Vacation', days: '5 days', dates: 'Feb 1-5' },
            ],
          },
          timestamp: new Date(),
        };
      } else {
        response = {
          id: (Date.now() + 2).toString(),
          type: 'ai',
          content:
            'I can help you with attendance data, trends, and employee information. Try asking about late employees, attendance trends, or pending leave requests.',
          timestamp: new Date(),
        };
      }

      this.messages = this.messages.filter(msg => msg.type !== 'loading').concat(response);
      this.isLoading = false;
      this.shouldScroll = true;
    }, 2400);
  }

  handleSuggestionClick(suggestion: string): void {
    this.input = suggestion;
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
