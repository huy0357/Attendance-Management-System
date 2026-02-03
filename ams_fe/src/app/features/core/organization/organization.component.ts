import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-organization',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="organization">
      <h1>Quản lý Tổ chức</h1>
      <p>Quản lý sơ đồ tổ chức hiển thị dạng cây (Tree View)</p>
      <!-- TODO: Implement tree view component -->
    </div>
  `,
  styles: [
    `
      .organization {
        padding: 2rem;
      }
    `,
  ],
})
export class OrganizationComponent {}
