import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="employee-list">
      <div class="header">
        <h1>Danh sách Nhân viên</h1>
        <button class="btn-add">Thêm nhân viên</button>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Mã NV</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Phòng ban</th>
              <th>Chức vụ</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="6" class="empty-state">Chưa có dữ liệu</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .employee-list {
        padding: 2rem;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }
      .btn-add {
        padding: 0.5rem 1rem;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      .table-container {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
      }
      .data-table th {
        background-color: #f8f9fa;
        padding: 1rem;
        text-align: left;
        font-weight: 600;
        border-bottom: 2px solid #dee2e6;
      }
      .data-table td {
        padding: 1rem;
        border-bottom: 1px solid #dee2e6;
      }
      .empty-state {
        text-align: center;
        color: #999;
        padding: 2rem !important;
      }
    `,
  ],
})
export class EmployeeListComponent {}
