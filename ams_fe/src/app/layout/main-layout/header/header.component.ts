import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="header">
      <div class="header-left">
        <button class="menu-toggle" (click)="onToggleSidebar()">
          <span>☰</span>
        </button>
        <h1 class="app-title">AMS - Attendance Management System</h1>
      </div>
      <div class="header-right">
        <div class="user-info" *ngIf="currentUser">
          <span class="user-name">{{ userDisplayName }}</span>
          <button class="logout-btn" (click)="logout()">Đăng xuất</button>
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        background-color: #fff;
        border-bottom: 1px solid #e0e0e0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .header-left {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .menu-toggle {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.5rem;
      }
      .app-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }
      .header-right {
        display: flex;
        align-items: center;
      }
      .user-info {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .user-name {
        font-weight: 500;
      }
      .logout-btn {
        padding: 0.5rem 1rem;
        background-color: #dc3545;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
    `,
  ],
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  currentUser: User | null = null;

  constructor(private authService: AuthService) {
    this.currentUser = this.authService.getCurrentUser();
  }

  get userDisplayName(): string {
    return this.currentUser?.username || 'User';
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  logout(): void {
    this.authService.logout();
  }
}
