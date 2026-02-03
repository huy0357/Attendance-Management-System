import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kpi">
      <h1>Nhập liệu KPI</h1>
      <p>Cho Manager nhập điểm KPI/Bonus cuối tháng</p>
    </div>
  `,
  styles: [
    `
      .kpi {
        padding: 2rem;
      }
    `,
  ],
})
export class KpiComponent {}
