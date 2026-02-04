import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-blue-50 p-6 flex items-center justify-center">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center max-w-md">
        <h1 class="text-2xl font-semibold text-slate-800">Unauthorized</h1>
        <p class="text-slate-600 text-sm mt-2">
          You do not have permission to access this page.
        </p>
        <a
          routerLink="/dashboard"
          class="inline-flex items-center justify-center mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  `,
})
export class UnauthorizedComponent {}
