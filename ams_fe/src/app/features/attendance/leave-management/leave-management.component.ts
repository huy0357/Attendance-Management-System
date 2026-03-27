import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AttendanceService, LeaveRequest } from '../attendance.service';

@Component({
  standalone: false,
  selector: 'app-leave-management',
  templateUrl: './leave-management.component.html',
  styleUrls: ['./leave-management.component.scss'],
})
export class LeaveManagementComponent implements OnInit {
  activeTab: 'open' | 'approved' | 'rejected' | 'cancelled' | 'all' = 'open';
  showReviewModal = false;
  selectedRequest: LeaveRequest | null = null;

  leaveRequests: LeaveRequest[] = [];
  isLoading = false;
  errorMessage = '';

  filterForm: FormGroup;

  constructor(
    private attendanceService: AttendanceService,
    private fb: FormBuilder,
  ) {
    this.filterForm = this.fb.group({
      searchQuery: [''],
    });
  }

  ngOnInit(): void {
    this.loadLeaveRequests();
  }

  get filteredRequests(): LeaveRequest[] {
    const { searchQuery } = this.filterForm.value as {
      searchQuery: string;
    };
    const query = (searchQuery || '').trim().toLowerCase();

    return this.leaveRequests.filter((request) => {
      const matchesTab = this.matchesActiveTab(request);
      const matchesSearch =
        !query ||
        String(request.requestId).includes(query) ||
        request.employeeName.toLowerCase().includes(query) ||
        request.title.toLowerCase().includes(query) ||
        request.reason.toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }

  get stats(): Array<{ label: string; value: number; color: string; bg: string; icon: string }> {
    return [
      {
        label: 'Open Requests',
        value: this.leaveRequests.filter((request) => this.isOpenStatus(request.status)).length,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        icon: 'clock',
      },
      {
        label: 'Approved Requests',
        value: this.leaveRequests.filter((request) => request.status === 'APPROVED').length,
        color: 'text-green-600',
        bg: 'bg-green-50',
        icon: 'check-circle',
      },
      {
        label: 'Rejected Requests',
        value: this.leaveRequests.filter((request) => request.status === 'REJECTED').length,
        color: 'text-red-600',
        bg: 'bg-red-50',
        icon: 'x-circle',
      },
      {
        label: 'Cancelled Requests',
        value: this.leaveRequests.filter((request) => request.status === 'CANCELLED').length,
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        icon: 'ban',
      },
      {
        label: 'Total Requests',
        value: this.leaveRequests.length,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        icon: 'calendar',
      },
    ];
  }

  setActiveTab(tab: 'open' | 'approved' | 'rejected' | 'cancelled' | 'all'): void {
    this.activeTab = tab;
  }

  openReviewModal(request: LeaveRequest): void {
    this.selectedRequest = request;
    this.showReviewModal = true;
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.selectedRequest = null;
  }

  getStatusColor(status: LeaveRequest['status']): string {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'APPROVED':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  }

  getStatusIcon(status: LeaveRequest['status']): string {
    switch (status) {
      case 'DRAFT':
        return 'file-text';
      case 'SUBMITTED':
        return 'clock';
      case 'APPROVED':
        return 'check-circle';
      case 'REJECTED':
        return 'x-circle';
      case 'CANCELLED':
        return 'ban';
      default:
        return 'alert-circle';
    }
  }

  getStatusLabel(status: LeaveRequest['status']): string {
    switch (status) {
      case 'DRAFT':
        return 'Draft';
      case 'SUBMITTED':
        return 'Submitted';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  formatDate(dateValue?: string): string {
    if (!dateValue) {
      return 'Not submitted';
    }
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) {
      return dateValue;
    }
    return parsedDate.toLocaleDateString();
  }

  formatDateTime(dateValue?: string): string {
    if (!dateValue) {
      return 'Not submitted';
    }
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) {
      return dateValue;
    }
    return parsedDate.toLocaleString();
  }

  getTabCount(tab: 'open' | 'approved' | 'rejected' | 'cancelled' | 'all'): number {
    if (tab === 'all') {
      return this.leaveRequests.length;
    }
    return this.leaveRequests.filter((request) => {
      if (tab === 'open') {
        return this.isOpenStatus(request.status);
      }
      if (tab === 'approved') {
        return request.status === 'APPROVED';
      }
      if (tab === 'cancelled') {
        return request.status === 'CANCELLED';
      }
      return request.status === 'REJECTED';
    }).length;
  }

  private loadLeaveRequests(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.attendanceService.getLeaveRequests().subscribe({
      next: (data) => {
        this.leaveRequests = data;
        this.isLoading = false;
      },
      error: () => {
        this.leaveRequests = [];
        this.errorMessage = 'Unable to load leave requests for the signed-in employee.';
        this.isLoading = false;
      },
    });
  }

  private matchesActiveTab(request: LeaveRequest): boolean {
    if (this.activeTab === 'all') {
      return true;
    }
    if (this.activeTab === 'open') {
      return this.isOpenStatus(request.status);
    }
    if (this.activeTab === 'approved') {
      return request.status === 'APPROVED';
    }
    if (this.activeTab === 'cancelled') {
      return request.status === 'CANCELLED';
    }
    return request.status === 'REJECTED';
  }

  private isOpenStatus(status: LeaveRequest['status']): boolean {
    return status === 'DRAFT' || status === 'SUBMITTED';
  }
}
