import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceService, LeaveRequest } from '../attendance.service';

@Component({
  standalone: false,
  selector: 'app-leave-management',
  templateUrl: './leave-management.component.html',
  styleUrls: ['./leave-management.component.scss'],
})
export class LeaveManagementComponent implements OnInit {
  activeTab: 'pending' | 'approved' | 'rejected' | 'all' = 'pending';
  showAddModal = false;
  showReviewModal = false;
  selectedRequest: LeaveRequest | null = null;

  leaveRequests: LeaveRequest[] = [];

  filterForm: FormGroup;
  newRequestForm: FormGroup;
  reviewForm: FormGroup;

  readonly departments = ['All', 'Operations', 'Engineering', 'Sales', 'HR', 'Finance'];
  readonly leaveTypes = ['All', 'Annual', 'Sick', 'Personal', 'Maternity', 'Paternity', 'Unpaid'];

  constructor(private attendanceService: AttendanceService, private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      searchQuery: [''],
      department: ['All'],
      leaveType: ['All'],
    });

    this.newRequestForm = this.fb.group({
      employeeName: ['', Validators.required],
      department: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      leaveType: ['Annual', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      reason: ['', Validators.required],
    });

    this.reviewForm = this.fb.group({
      action: ['Approved', Validators.required],
      notes: [''],
    });
  }

  ngOnInit(): void {
    this.attendanceService.getLeaveRequests().subscribe((data) => (this.leaveRequests = data));
  }

  get filteredRequests(): LeaveRequest[] {
    const { searchQuery, department, leaveType } = this.filterForm.value as {
      searchQuery: string;
      department: string;
      leaveType: string;
    };

    return this.leaveRequests.filter((req) => {
      const matchesTab =
        this.activeTab === 'all' ||
        req.status === this.activeTab.charAt(0).toUpperCase() + this.activeTab.slice(1);
      const query = (searchQuery || '').toLowerCase();
      const matchesSearch =
        req.employeeName.toLowerCase().includes(query) ||
        req.id.toLowerCase().includes(query) ||
        req.email.toLowerCase().includes(query);
      const matchesDepartment = department === 'All' || req.department === department;
      const matchesLeaveType = leaveType === 'All' || req.leaveType === leaveType;
      return matchesTab && matchesSearch && matchesDepartment && matchesLeaveType;
    });
  }

  get stats(): Array<{ label: string; value: number; color: string; bg: string; icon: string }> {
    return [
      {
        label: 'Pending Requests',
        value: this.leaveRequests.filter((r) => r.status === 'Pending').length,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        icon: 'clock',
      },
      {
        label: 'Approved This Month',
        value: this.leaveRequests.filter((r) => r.status === 'Approved').length,
        color: 'text-green-600',
        bg: 'bg-green-50',
        icon: 'check-circle',
      },
      {
        label: 'Rejected This Month',
        value: this.leaveRequests.filter((r) => r.status === 'Rejected').length,
        color: 'text-red-600',
        bg: 'bg-red-50',
        icon: 'x-circle',
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

  setActiveTab(tab: 'pending' | 'approved' | 'rejected' | 'all'): void {
    this.activeTab = tab;
  }

  calculateDays(start: string, end: string): number {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  openAddModal(): void {
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  handleAddRequest(): void {
    if (this.newRequestForm.invalid) return;
    const formValue = this.newRequestForm.value as {
      employeeName: string;
      department: string;
      email: string;
      leaveType: LeaveRequest['leaveType'];
      startDate: string;
      endDate: string;
      reason: string;
    };

    const days = this.calculateDays(formValue.startDate, formValue.endDate);
    const request: LeaveRequest = {
      id: `LR${String(this.leaveRequests.length + 1).padStart(3, '0')}`,
      employeeId: `EMP${String(this.leaveRequests.length + 1).padStart(3, '0')}`,
      employeeName: formValue.employeeName,
      department: formValue.department,
      email: formValue.email,
      leaveType: formValue.leaveType,
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      days,
      reason: formValue.reason,
      status: 'Pending',
      submittedVia: 'Manual',
      submittedDate: new Date().toISOString().split('T')[0],
    };

    this.leaveRequests = [...this.leaveRequests, request];
    this.newRequestForm.reset({
      employeeName: '',
      department: '',
      email: '',
      leaveType: 'Annual',
      startDate: '',
      endDate: '',
      reason: '',
    });
    this.showAddModal = false;
  }

  openReviewModal(request: LeaveRequest, action?: 'Approved' | 'Rejected'): void {
    this.selectedRequest = request;
    this.reviewForm.reset({
      action: action || 'Approved',
      notes: '',
    });
    this.showReviewModal = true;
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.selectedRequest = null;
  }

  handleReview(): void {
    if (!this.selectedRequest) return;
    const { action, notes } = this.reviewForm.value as { action: 'Approved' | 'Rejected'; notes: string };
    this.leaveRequests = this.leaveRequests.map((req) =>
      req.id === this.selectedRequest?.id
        ? {
            ...req,
            status: action,
            reviewedBy: 'Admin User',
            reviewedDate: new Date().toISOString().split('T')[0],
            reviewNotes: notes,
          }
        : req,
    );
    this.showReviewModal = false;
    this.selectedRequest = null;
  }

  getStatusColor(status: LeaveRequest['status']): string {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Approved':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'Rejected':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  }

  getStatusIcon(status: LeaveRequest['status']): string {
    switch (status) {
      case 'Pending':
        return 'clock';
      case 'Approved':
        return 'check-circle';
      case 'Rejected':
        return 'x-circle';
      default:
        return 'alert-circle';
    }
  }

  formatDate(dateValue: string): string {
    return new Date(dateValue).toLocaleDateString();
  }

  getTabCount(tab: 'pending' | 'approved' | 'rejected' | 'all'): number {
    if (tab === 'all') return this.leaveRequests.length;
    const status = tab.charAt(0).toUpperCase() + tab.slice(1);
    return this.leaveRequests.filter((r) => r.status === status).length;
  }
}

