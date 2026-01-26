import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-timesheet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timesheet">
      <h1>Bảng công Tổng hợp</h1>
      <p>Bảng công tháng. Highlight cảnh báo đỏ (Muộn/Vắng)</p>
      <!-- TODO: Implement timesheet matrix table -->
    </div>
  `,
  styles: [
    `
      .timesheet {
        padding: 2rem;
      }
    `,
  ],
})
export class TimesheetComponent {}
