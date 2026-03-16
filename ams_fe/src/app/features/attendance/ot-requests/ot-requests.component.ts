import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { RequestsService } from '../../../core/services/requests.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AccountService } from '../../../core/services/account.service';
import { RequestsApprovalRequest, RequestsResponse } from '../../../shared/models/requests.model';
import { map, switchMap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';

interface OtRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  department: string;
  position: string;
  date: string;
  hours: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
  reviewNotes?: string;
  estimatedPay?: number;
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

  filterForm: FormGroup;
  reviewForm: FormGroup;

  showReviewModal = false;
  showDetailsModal = false;
  selectedRequest: OtRequest | null = null;
  reviewAction: 'approve' | 'reject' = 'approve';

  readonly statuses = ['All Status', 'Pending', 'Approved', 'Rejected'];

  constructor(
    private requestsService: RequestsService,
    private authService: AuthService,
    private accountService: AccountService,
    private fb: FormBuilder,
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
    this.loadRequests();

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
    const requestId = Number(this.selectedRequest.id);
    if (!Number.isFinite(requestId)) {
      alert('Invalid request ID.');
      return;
    }
    const status = this.reviewAction === 'approve' ? 'APPROVED' : 'REJECTED';
    this.resolveEmployeeId().pipe(
      switchMap((approverId) => {
        const payload: RequestsApprovalRequest = {
          approverId,
          status,
          decisionNote: notes,
        };
        return this.requestsService.approveOrReject(requestId, payload);
      }),
    ).subscribe({
      next: () => {
        this.loadRequests(() => this.closeReviewModal());
      },
      error: (error: HttpErrorResponse) => {
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
    return new Date(dateValue).toLocaleDateString();
  }

  private loadRequests(afterLoad?: () => void): void {
    this.requests = [];
    this.filteredRequests = [];
    this.errorMessage = null;

    this.resolveEmployeeId().pipe(
      switchMap((employeeId) => this.requestsService.getOvertimeRequests(employeeId)),
    ).subscribe({
      next: (data) => {
        this.requests = data.map((request) => this.mapRequestToOt(request));
        this.applyFilters();
        if (afterLoad) {
          afterLoad();
        }
      },
      error: (error: HttpErrorResponse) => {
        this.requests = [];
        this.filteredRequests = [];
        const message = this.resolveErrorMessage(error, 'Unable to load OT requests.');
        this.errorMessage = message;
        alert(message);
      },
    });
  }

  private resolveEmployeeId(): Observable<number> {
    const username = this.getEffectiveUsername();
    if (!username) {
      this.errorMessage = 'Kh\u00f4ng x\u00e1c \u0111\u1ecbnh \u0111\u01b0\u1ee3c employeeId \u0111\u1ec3 t\u1ea3i y\u00eau c\u1ea7u.';
      return throwError(() => new Error('Missing username in auth context.'));
    }

    return this.accountService.findByUsername(username).pipe(
      map((account) => {
        const employeeId = account?.employeeId;
        if (!employeeId) {
          throw new Error('Employee not found for username.');
        }
        return employeeId;
      }),
    );
  }

  private getEffectiveUsername(): string | null {
    const stored = (this.authService.getUsername() || '').trim();
    if (stored) {
      return stored;
    }
    const token = this.authService.getAccessToken();
    if (!token) {
      return null;
    }
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    try {
      const json = atob(padded);
      const payload = JSON.parse(json) as { sub?: string; username?: string; email?: string };
      return (payload.username || payload.email || payload.sub || '').trim() || null;
    } catch {
      return null;
    }
  }

  private mapRequestToOt(request: RequestsResponse): OtRequest {
    const employeeName = request.employeeName ?? '';
    return {
      id: String(request.requestId),
      employeeId: String(request.employeeId ?? ''),
      employeeName,
      employeeAvatar: this.toInitials(employeeName),
      department: '',
      position: '',
      date: request.startDatetime ?? request.endDatetime ?? request.submittedAt ?? '',
      hours: this.calculateHours(request.startDatetime, request.endDatetime),
      reason: request.reason ?? '',
      status: this.mapRequestStatus(request.status),
      submittedDate: request.submittedAt ?? request.startDatetime ?? '',
      reviewedBy: request.approverName ?? undefined,
      reviewNotes: request.decisionNote ?? undefined,
      estimatedPay: undefined,
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

  private calculateHours(start?: string, end?: string): number {
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
      return 'Kh\u00f4ng c\u00f3 quy\u1ec1n';
    }
    if (error.status === 400 || error.status === 422) {
      return error.error?.message || error.error?.error || fallback;
    }
    if (error.status >= 500) {
      return 'C\u00f3 l\u1ed7i x\u1ea3y ra. Vui l\u00f2ng th\u1eed l\u1ea1i.';
    }
    return fallback;
  }
}
