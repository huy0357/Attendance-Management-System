import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RequestsService } from '../../../core/services/requests.service';
import { AuthService } from '../../../core/auth/auth.service';
import { RequestsApprovalRequest, RequestsResponse } from '../../../shared/models/requests.model';

interface OtRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  date: string;
  hours: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  reviewedBy?: string;
  reviewNotes?: string;
  canReview: boolean;
}

@Component({
  standalone: false,
  selector: 'app-ot-requests',
  templateUrl: './ot-requests.component.html',
  styleUrls: ['./ot-requests.component.scss'],
})
export class OtRequestsComponent implements OnInit {
  requests: OtRequest[] = [];
  filteredRequests: OtRequest[] = [];
  errorMessage: string | null = null;
  helperMessage = '';
  selectedEmployeeId: number | null = null;
  isLoading = false;
  isReviewSaving = false;

  filterForm: FormGroup;
  reviewForm: FormGroup;

  showReviewModal = false;
  showDetailsModal = false;
  selectedRequest: OtRequest | null = null;
  reviewAction: 'approve' | 'reject' = 'approve';
  canApproveRequests = false;

  readonly statuses = ['All Status', 'Pending', 'Approved', 'Rejected'];

  constructor(
    private readonly requestsService: RequestsService,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly fb: FormBuilder,
  ) {
    this.filterForm = this.fb.group({
      searchQuery: [''],
      status: ['All Status'],
    });

    this.reviewForm = this.fb.group({
      notes: [''],
    });
  }

  ngOnInit(): void {
    this.canApproveRequests = this.getNormalizedRole() === 'MANAGER';

    this.helperMessage = 'This page only renders OT fields backed by /api/requests. Employee lookup is intentionally hidden because backend does not expose a manager-safe /api/employees lookup flow.';

    this.filterForm.get('searchQuery')?.valueChanges.subscribe(() => this.applyFilters());
    this.filterForm.get('status')?.valueChanges.subscribe(() => this.applyFilters());
    this.route.queryParamMap.subscribe((queryParams) => {
      const routeEmployeeId = Number(queryParams.get('employeeId'));
      const nextEmployeeId = Number.isInteger(routeEmployeeId) && routeEmployeeId > 0
        ? routeEmployeeId
        : null;

      if (nextEmployeeId === this.selectedEmployeeId) {
        return;
      }

      this.selectedEmployeeId = nextEmployeeId;

      if (!this.selectedEmployeeId) {
        this.requests = [];
        this.filteredRequests = [];
        this.errorMessage = null;
        return;
      }

      this.loadRequests(this.selectedEmployeeId);
    });
  }

  get stats(): Array<{ label: string; value: string | number; color: string; bg: string; icon: string }> {
    const approvedHours = this.requests
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + r.hours, 0);

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
        label: 'Approved Hours',
        value: approvedHours.toFixed(2),
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        icon: 'timer',
      },
    ];
  }

  get pendingCount(): number {
    return this.requests.filter((r) => r.status === 'pending').length;
  }

  get currentEmployeeId(): number | null {
    return this.authService.getEmployeeId();
  }

  applyFilters(): void {
    const { searchQuery, status } = this.filterForm.value as { searchQuery: string; status: string };
    const query = (searchQuery || '').toLowerCase();

    this.filteredRequests = this.requests.filter((request) => {
      const matchesSearch =
        request.employeeName.toLowerCase().includes(query) ||
        request.id.toLowerCase().includes(query) ||
        request.employeeId.toLowerCase().includes(query);
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
    if (!this.selectedRequest || !this.currentEmployeeId) {
      return;
    }

    const notes = (this.reviewForm.value as { notes: string }).notes || '';
    const requestId = Number(this.selectedRequest.id);
    if (!Number.isFinite(requestId)) {
      alert('Invalid request ID.');
      return;
    }

    const payload: RequestsApprovalRequest = {
      approverId: this.currentEmployeeId,
      status: this.reviewAction === 'approve' ? 'APPROVED' : 'REJECTED',
      decisionNote: notes,
    };

    this.isReviewSaving = true;
    this.requestsService.approveOrReject(requestId, payload).subscribe({
      next: () => {
        this.isReviewSaving = false;
        if (this.selectedEmployeeId) {
          this.loadRequests(this.selectedEmployeeId, () => this.closeReviewModal());
        } else {
          this.closeReviewModal();
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isReviewSaving = false;
        alert(this.resolveErrorMessage(error, 'Unable to update request. Please try again.'));
      },
    });
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
    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? dateValue : parsed.toLocaleString();
  }

  private loadRequests(employeeId: number, afterLoad?: () => void): void {
    this.requests = [];
    this.filteredRequests = [];
    this.errorMessage = null;
    this.isLoading = true;

    this.requestsService.getRequestsByEmployee(employeeId).subscribe({
      next: (data) => {
        this.isLoading = false;
        this.requests = data
          .filter((request) => request.requestType === 'OVERTIME')
          .map((request) => this.mapRequestToOt(request));
        this.applyFilters();
        if (afterLoad) {
          afterLoad();
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.requests = [];
        this.filteredRequests = [];
        this.errorMessage = this.resolveErrorMessage(error, 'Unable to load OT requests.');
      },
    });
  }

  private getNormalizedRole(): string | null {
    const role = this.authService.getRole();
    return role ? role.toUpperCase().replace('ROLE_', '') : null;
  }

  private mapRequestToOt(request: RequestsResponse): OtRequest {
    const employeeName = request.employeeName ?? `Employee #${request.employeeId ?? ''}`;
    return {
      id: String(request.requestId),
      employeeId: String(request.employeeId ?? ''),
      employeeName,
      employeeAvatar: this.toInitials(employeeName),
      date: request.startDatetime ?? request.endDatetime ?? request.submittedAt ?? '',
      hours: this.calculateHours(request.startDatetime, request.endDatetime),
      reason: request.reason ?? '',
      status: this.mapRequestStatus(request.status),
      submittedDate: request.submittedAt ?? request.startDatetime ?? '',
      reviewedBy: request.approverName ?? undefined,
      reviewNotes: request.decisionNote ?? undefined,
      canReview: request.status === 'SUBMITTED' && this.canApproveRequests,
    };
  }

  private mapRequestStatus(status: RequestsResponse['status']): OtRequest['status'] {
    if (status === 'APPROVED') {
      return 'approved';
    }
    if (status === 'REJECTED' || status === 'CANCELLED') {
      return 'rejected';
    }
    return 'pending';
  }

  private calculateHours(start?: string | null, end?: string | null): number {
    if (!start || !end) {
      return 0;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 0;
    }
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs <= 0) {
      return 0;
    }
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  }

  private toInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '';
    }
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
    return initials.join('');
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 403) {
      return 'You do not have permission for this action.';
    }
    if (error.status === 400 || error.status === 422) {
      return error.error?.message || error.error?.error || fallback;
    }
    if (error.status >= 500) {
      return error.error?.message || error.error?.error || fallback;
    }
    return fallback;
  }
}
