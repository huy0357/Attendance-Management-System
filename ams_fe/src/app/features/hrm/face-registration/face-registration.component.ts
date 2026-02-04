import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-face-registration',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="face-registration">
      <h1>Đăng ký Webcam</h1>
      <p>Giao diện Admin chụp ảnh lấy mẫu Vector gốc tại chỗ</p>
      <!-- TODO: Implement webcam capture -->
    </div>
  `,
  styles: [
    `
      .face-registration {
        padding: 2rem;
      }
    `,
  ],
})
export class FaceRegistrationComponent {}
