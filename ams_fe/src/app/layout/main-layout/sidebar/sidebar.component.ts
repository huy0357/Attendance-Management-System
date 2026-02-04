import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  children?: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed">
      <nav class="sidebar-nav">
        <ul class="menu-list">
          <li *ngFor="let item of menuItems" class="menu-item">
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: false }"
              class="menu-link">
              <span class="menu-icon">{{ item.icon }}</span>
              <span class="menu-label" *ngIf="!collapsed">{{ item.label }}</span>
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  `,
  styles: [
    `
      .sidebar {
        width: 250px;
        height: 100vh;
        background-color: #2c3e50;
        color: white;
        transition: width 0.3s ease;
        overflow-y: auto;
        flex-shrink: 0;
      }
      .sidebar.collapsed {
        width: 80px;
      }
      .sidebar-nav {
        padding: 1rem 0;
      }
      .menu-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .menu-item {
        margin: 0.25rem 0;
      }
      .menu-link {
        display: flex;
        align-items: center;
        padding: 0.75rem 1rem;
        color: white;
        text-decoration: none;
        transition: background-color 0.2s;
        gap: 0.75rem;
      }
      .menu-link:hover {
        background-color: #34495e;
      }
      .menu-link.active {
        background-color: #3498db;
      }
      .menu-icon {
        font-size: 1.25rem;
        min-width: 24px;
      }
      .menu-label {
        white-space: nowrap;
      }
      .sidebar.collapsed .menu-label {
        display: none;
      }
    `,
  ],
})
export class SidebarComponent {
  @Input() collapsed = false;

  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: '📊', route: '/dashboard' },
    { label: 'Nhân sự', icon: '👥', route: '/hrm' },
    { label: 'Chấm công', icon: '⏰', route: '/attendance' },
    { label: 'Lương', icon: '💰', route: '/payroll' },
    { label: 'Báo cáo', icon: '📈', route: '/reports' },
    { label: 'Máy chấm công', icon: '📷', route: '/face-recognition' },
    { label: 'Chatbot', icon: '💬', route: '/chatbot' },
  ];
}
