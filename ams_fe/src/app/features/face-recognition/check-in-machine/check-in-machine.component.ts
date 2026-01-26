import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-check-in-machine',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="check-in-machine">
      <h1>Giao diện Máy chấm công</h1>
      <p>Fullscreen, Streaming Camera, Vẽ Box nhận diện</p>
    </div>
  `,
  styles: [
    `
      .check-in-machine {
        padding: 2rem;
      }
    `,
  ],
})
export class CheckInMachineComponent {}
