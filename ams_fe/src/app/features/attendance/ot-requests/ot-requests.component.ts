import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AttendanceService, OtRequest } from '../attendance.service';

@Component({
  standalone: false,
  selector: 'app-ot-requests',
  templateUrl: './ot-requests.component.html',
  styleUrls: ['./ot-requests.component.scss'],
})
export class OtRequestsComponent implements OnInit {
  requests: OtRequest[] = [];
  filteredRequests: OtRequest[] = [];

  filterForm: FormGroup;
  reviewForm: FormGroup;

  showReviewModal = false;
  showDetailsModal = false;
  selectedRequest: OtRequest | null = null;
  reviewAction: 'approve' | 'reject' = 'approve';

  readonly statuses = ['All Status', 'Pending', 'Approved', 'Rejected'];

  constructor(private attendanceService: AttendanceService, private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      searchQuery: [''],
      status: ['All Status'],
    });

    this.reviewForm = this.fb.group({
      notes: [''],
    });
  }

  ngOnInit(): void {
    this.attendanceService.getOtRequests().subscribe((data) => {
      this.requests = data;
      this.applyFilters();
    });

    this.filterForm.valueChanges.subscribe(() => this.applyFilters());
  }

  get stats(): Array<{ label: string; value: string | number; color: string; bg: string; icon: string }> {
    const approvedTotal = this.requests
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + (r.estimatedPay || 0), 0);

    return [
      {
        label: 'Total Requests',
        value: this.requests.length,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        icon: 'users',
      },
      {
        label: 'Pending Review',
        value: this.requests.filter((r) => r.status === 'pending').length,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        icon: 'clock',
      },
      {
        label: 'Approved',
        value: this.requests.filter((r) => r.status === 'approved').length,
        color: 'text-green-600',
        bg: 'bg-green-50',
        icon: 'check-circle',
      },
      {
        label: 'Est. Cost',
        value: `$${approvedTotal.toFixed(2)}`,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        icon: 'dollar-sign',
      },
    ];
  }

  get pendingCount(): number {
    return this.requests.filter((r) => r.status === 'pending').length;
  }

  applyFilters(): void {
    const { searchQuery, status } = this.filterForm.value as { searchQuery: string; status: string };
    const query = (searchQuery || '').toLowerCase();

    this.filteredRequests = this.requests.filter((request) => {
      const matchesSearch =
        request.employeeName.toLowerCase().includes(query) ||
        request.id.toLowerCase().includes(query) ||
        request.department.toLowerCase().includes(query);
      const matchesStatus =
        status === 'All Status' || request.status.toLowerCase() === status.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }

  openReviewModal(request: OtRequest, action: 'approve' | 'reject'): void {
    this.selectedRequest = request;
    this.reviewAction = action;
    this.reviewForm.reset({ notes: '' });
    this.showReviewModal = true;
  }

  openDetailsModal(request: OtRequest): void {
    this.selectedRequest = request;
    this.showDetailsModal = true;
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.selectedRequest = null;
    this.reviewForm.reset({ notes: '' });
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedRequest = null;
  }

  handleReview(): void {
    if (!this.selectedRequest) return;
    const notes = (this.reviewForm.value as { notes: string }).notes || '';
    this.requests = this.requests.map((r) =>
      r.id === this.selectedRequest?.id
        ? {
            ...r,
            status: this.reviewAction === 'approve' ? 'approved' : 'rejected',
            reviewedBy: 'Admin User',
            reviewedDate: new Date().toISOString().split('T')[0],
            reviewNotes: notes,
          }
        : r,
    );
    this.applyFilters();
    this.closeReviewModal();
  }

  getStatusBadgeClass(status: OtRequest['status']): string {
    const styles: Record<OtRequest['status'], string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      approved: 'bg-green-100 text-green-700 border-green-300',
      rejected: 'bg-red-100 text-red-700 border-red-300',
    };
    return styles[status];
  }

  getStatusIcon(status: OtRequest['status']): string {
    const icons: Record<OtRequest['status'], string> = {
      pending: 'clock',
      approved: 'check-circle',
      rejected: 'x-circle',
    };
    return icons[status];
  }

  getStatusLabel(status: OtRequest['status']): string {
    const labels: Record<OtRequest['status'], string> = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
    };
    return labels[status];
  }

  formatDate(dateValue: string): string {
    return new Date(dateValue).toLocaleDateString();
  }
}

