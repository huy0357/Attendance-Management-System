import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { switchMap } from 'rxjs/operators';
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

    this.attendanceService
      .findEmployeeByNameOrEmail(formValue.employeeName, formValue.email)
      .pipe(
        switchMap((employee) => {
          if (!employee) {
            throw new Error('Employee not found');
          }
          return this.attendanceService.createRequest({
            employeeId: employee.employeeId,
            requestType: 'LEAVE',
            title: formValue.leaveType,
            reason: formValue.reason,
            startDatetime: `${formValue.startDate}T00:00:00`,
            endDatetime: `${formValue.endDate}T23:59:59`,
          });
        }),
      )
      .subscribe({
        next: () => {
          this.attendanceService.getLeaveRequests().subscribe((data) => (this.leaveRequests = data));
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
        },
        error: () => {
          alert('Unable to submit leave request. Please verify employee info and try again.');
        },
      });
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
    const requestId = Number(this.selectedRequest.id);
    if (!Number.isFinite(requestId)) {
      alert('Invalid request ID.');
      return;
    }
    const status = action === 'Approved' ? 'APPROVED' : 'REJECTED';
    this.attendanceService.approveRequest(requestId, status, notes).subscribe({
      next: () => {
        this.attendanceService.getLeaveRequests().subscribe((data) => (this.leaveRequests = data));
        this.showReviewModal = false;
        this.selectedRequest = null;
      },
      error: () => {
        alert('Unable to update request. Please try again.');
      },
    });
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

