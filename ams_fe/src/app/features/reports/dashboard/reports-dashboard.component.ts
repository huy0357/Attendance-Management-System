import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reports-dashboard">
      <h1>Báo cáo & Dashboard</h1>
      <p>API biến động nhân sự, quỹ lương, realtime check-in</p>
    </div>
  `,
  styles: [
    `
      .reports-dashboard {
        padding: 2rem;
      }
    `,
  ],
})
export class ReportsDashboardComponent {}
