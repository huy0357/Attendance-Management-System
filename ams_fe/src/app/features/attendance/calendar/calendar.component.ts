import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="calendar">
      <h1>Lịch làm việc</h1>
      <p>Calendar View. Drag & Drop nhân viên vào ca</p>
    </div>
  `,
  styles: [
    `
      .calendar {
        padding: 2rem;
      }
    `,
  ],
})
export class CalendarComponent {}
