import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="app-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .app-container {
        width: 100%;
        height: 100%;
        min-height: 100vh;
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  title = 'Attendance Management System';

  ngOnInit(): void {
    console.log('AppComponent initialized');
  }
}
