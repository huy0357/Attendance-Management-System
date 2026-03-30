import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-ai-chatbot',
  templateUrl: './ai-chatbot.component.html',
  styleUrls: ['./ai-chatbot.component.scss'],
})
export class AiChatbotComponent {
  @Output() closed = new EventEmitter<void>();
}
