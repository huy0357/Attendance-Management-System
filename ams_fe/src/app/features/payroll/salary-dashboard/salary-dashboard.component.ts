import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-salary-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="salary-dashboard">
      <h1>Dashboard Quản lý Lương</h1>
      <p>Bảng lương tổng hợp. Filter/Search. Export & Email Payslip</p>
    </div>
  `,
  styles: [
    `
      .salary-dashboard {
        padding: 2rem;
      }
    `,
  ],
})
export class SalaryDashboardComponent {}
