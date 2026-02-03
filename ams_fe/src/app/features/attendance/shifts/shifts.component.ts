import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-shifts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="shifts">
      <h1>Quản lý Ca làm việc</h1>
      <p>Cài đặt thông số ca & tham số chấm công</p>
    </div>
  `,
  styles: [
    `
      .shifts {
        padding: 2rem;
      }
    `,
  ],
})
export class ShiftsComponent {}
