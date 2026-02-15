import { Component, OnDestroy, OnInit } from '@angular/core';
import { AdminService, AuditLog, AuditLogAction } from '../admin.service';

interface AuditStat {
  label: string;
  value: number;
  color: string;
  bg: string;
  icon: string;
}

@Component({
  standalone: false,
  selector: 'app-audit-log',
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.scss'],
})
export class AuditLogComponent implements OnInit, OnDestroy {
  searchQuery = '';
  filterModule = 'All Modules';
  filterAction = 'All Actions';
  filterUser = 'All Users';
  startDate = '';
  endDate = '';
  showDetailsModal = false;
  selectedLog: AuditLog | null = null;

  logs: AuditLog[] = [];
  modules: string[] = ['All Modules', 'Employees', 'Contracts', 'Payroll Periods', 'OT Requests', 'Time Calculation', 'System'];
  actions: string[] = ['All Actions', 'Create', 'Update', 'Delete', 'Login', 'Logout', 'Approve', 'Reject', 'Lock', 'Unlock'];
  users: string[] = ['All Users', 'Admin User', 'Emma Wilson', 'Sarah Chen', 'Michael Ross'];

  private readonly todayReference = '2026-01-22';

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.adminService.getAuditLogs().subscribe((logs) => {
      this.logs = logs;
    });
  }

  ngOnDestroy(): void {
    this.selectedLog = null;
  }

  get filteredLogs(): AuditLog[] {
    return this.logs.filter((log) => {
      const searchLower = this.searchQuery.toLowerCase();
      const matchesSearch =
        log.userName.toLowerCase().includes(searchLower) ||
        log.module.toLowerCase().includes(searchLower) ||
        log.recordId.toLowerCase().includes(searchLower) ||
        log.id.toLowerCase().includes(searchLower);

      const matchesModule = this.filterModule === 'All Modules' || log.module === this.filterModule;
      const matchesAction =
        this.filterAction === 'All Actions' || log.action.toLowerCase() === this.filterAction.toLowerCase();
      const matchesUser = this.filterUser === 'All Users' || log.userName === this.filterUser;

      let matchesDateRange = true;
      if (this.startDate && this.endDate) {
        const logDate = new Date(log.timestamp);
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        matchesDateRange = logDate >= start && logDate <= end;
      }

      return matchesSearch && matchesModule && matchesAction && matchesUser && matchesDateRange;
    });
  }

  get stats(): AuditStat[] {
    return [
      {
        label: 'Total Logs',
        value: this.logs.length,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        icon: 'shield',
      },
      {
        label: 'Today',
        value: this.logs.filter((log) => log.timestamp.startsWith(this.todayReference)).length,
        color: 'text-green-600',
        bg: 'bg-green-50',
        icon: 'calendar',
      },
      {
        label: 'Critical Actions',
        value: this.logs.filter((log) => ['delete', 'lock', 'unlock'].includes(log.action)).length,
        color: 'text-red-600',
        bg: 'bg-red-50',
        icon: 'alert-circle',
      },
      {
        label: 'Active Users',
        value: new Set(this.logs.map((log) => log.userId)).size,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        icon: 'user',
      },
    ];
  }

  openDetails(log: AuditLog): void {
    this.selectedLog = log;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.showDetailsModal = false;
    this.selectedLog = null;
  }

  exportLogs(): void {
    window.alert('Feature under development');
  }

  getActionBadgeClasses(action: AuditLogAction): string {
    const styles: Record<AuditLogAction, string> = {
      create: 'bg-green-100 text-green-700 border-green-300',
      update: 'bg-blue-100 text-blue-700 border-blue-300',
      delete: 'bg-red-100 text-red-700 border-red-300',
      login: 'bg-purple-100 text-purple-700 border-purple-300',
      logout: 'bg-gray-100 text-gray-700 border-gray-300',
      approve: 'bg-green-100 text-green-700 border-green-300',
      reject: 'bg-red-100 text-red-700 border-red-300',
      lock: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      unlock: 'bg-orange-100 text-orange-700 border-orange-300',
    };

    return styles[action];
  }

  getActionIcon(action: AuditLogAction): string {
    const icons: Record<AuditLogAction, string> = {
      create: 'file-text',
      update: 'edit',
      delete: 'trash-2',
      login: 'user',
      logout: 'user',
      approve: 'file-text',
      reject: 'file-text',
      lock: 'lock',
      unlock: 'unlock',
    };

    return icons[action];
  }

  getActionLabel(action: AuditLogAction): string {
    return action.charAt(0).toUpperCase() + action.slice(1);
  }
}
