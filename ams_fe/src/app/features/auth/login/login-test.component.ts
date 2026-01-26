import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 2rem; background: #f0f0f0; min-height: 100vh;">
      <h1 style="color: #333; font-size: 2rem; margin-bottom: 1rem;">Login Test Page</h1>
      <p style="color: #666;">Nếu bạn thấy trang này, routing đang hoạt động!</p>
      <div style="margin-top: 2rem; padding: 1rem; background: white; border-radius: 8px;">
        <p>Component đã được load thành công.</p>
      </div>
    </div>
  `,
  styles: [],
})
export class LoginTestComponent {}
