import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <h1>Dashboard</h1>
      <div class="dashboard-grid">
        <div class="stat-card">
          <h3>Tổng nhân viên</h3>
          <p class="stat-value">0</p>
        </div>
        <div class="stat-card">
          <h3>Chấm công hôm nay</h3>
          <p class="stat-value">0</p>
        </div>
        <div class="stat-card">
          <h3>Đi muộn</h3>
          <p class="stat-value">0</p>
        </div>
        <div class="stat-card">
          <h3>Tổng lương tháng</h3>
          <p class="stat-value">0 ₫</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard {
        padding: 2rem;
      }
      h1 {
        margin-bottom: 2rem;
      }
      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
      }
      .stat-card {
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .stat-card h3 {
        margin: 0 0 1rem 0;
        color: #666;
        font-size: 0.875rem;
        font-weight: 500;
      }
      .stat-value {
        margin: 0;
        font-size: 2rem;
        font-weight: 600;
        color: #333;
      }
    `,
  ],
})
export class DashboardComponent {}
