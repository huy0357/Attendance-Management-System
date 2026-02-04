import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chatbot">
      <h1>Chatbot truy vấn thông minh</h1>
      <p>Tổng hợp và diễn giải kết quả truy vấn cho người dùng</p>
    </div>
  `,
  styles: [
    `
      .chatbot {
        padding: 2rem;
      }
    `,
  ],
})
export class ChatbotComponent {}
