import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { RequestsService } from '../../../core/services/requests.service';
import { AuthService } from '../../../core/auth/auth.service';
import { RequestsResponse } from '../../../shared/models/requests.model';

@Component({
  standalone: false,
  selector: 'app-requests-management',
  templateUrl: './requests-management.component.html',
  styleUrls: ['./requests-management.component.scss'],
})
export class RequestsManagementComponent implements OnInit {
  requests: RequestsResponse[] = [];
  currentEmployeeId: number | null = null;

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  submittingRequestId: number | null = null;

  createForm: FormGroup;
  editForm: FormGroup;
  showCreateForm = false;
  showEditForm = false;
  selectedRequestId: number | null = null;

  constructor(
    private readonly requestsService: RequestsService,
    private readonly authService: AuthService,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.createForm = this.fb.group({
      requestType: ['LEAVE', Validators.required],
      title: ['', Validators.required],
      reason: [''],
      startDatetime: ['', Validators.required],
      endDatetime: ['', Validators.required],
    }, { validators: this.requestDateRangeValidator() });

    this.editForm = this.fb.group({
      requestType: ['', Validators.required],
      title: ['', Validators.required],
      reason: [''],
      startDatetime: ['', Validators.required],
      endDatetime: ['', Validators.required],
    }, { validators: this.requestDateRangeValidator() });

  }

  ngOnInit(): void {
    this.requestsService.resolveEmployeeIdFromAuthContext().subscribe({
      next: (employeeId) => {
        this.currentEmployeeId = employeeId;
        this.loadRequests();
      },
      error: () => {
        this.currentEmployeeId = null;
        this.errorMessage = 'Missing employeeId in auth context for loading requests.';
      },
    });
  }

  get canApproveRequests(): boolean {
    return this.authService.hasRole('MANAGER');
  }

  get reviewerFlowNotice(): string {
    return 'Reviewer actions are hidden here because backend approval only exposes PUT /api/requests/{id}/approval, while manager-safe employee lookup/list APIs are not available. FE keeps this page in self-service mode to avoid guaranteed /api/employees/** failures.';
  }

  loadRequests(): void {
    if (!this.currentEmployeeId) {
      this.requests = [];
      this.errorMessage = 'Missing employeeId in auth context for loading requests.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.requestsService.getRequestsByEmployee(this.currentEmployeeId)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
      next: (data: RequestsResponse[]) => {
        this.requests = data;
      },
      error: (error: HttpErrorResponse) => {
        this.requests = [];
        this.handleError(error, 'Unable to load requests.');
      },
    });
  }

  submitRequest(request: RequestsResponse): void {
    if (!this.currentEmployeeId || request.status !== 'DRAFT' || this.submittingRequestId === request.requestId) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.submittingRequestId = request.requestId;

    this.requestsService.submitRequest(request.requestId).subscribe({
      next: () => {
        this.requestsService.getRequestsByEmployee(this.currentEmployeeId as number).subscribe({
          next: (data: RequestsResponse[]) => {
            this.requests = data;
            this.successMessage = `Request ${request.requestId} submitted successfully.`;
            this.submittingRequestId = null;
          },
          error: (error: HttpErrorResponse) => {
            this.submittingRequestId = null;
            this.handleError(error, 'Unable to reload requests after submit.');
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.submittingRequestId = null;
        this.handleError(error, 'Unable to submit request.');
      },
    });
  }

  openCreate(): void {
    this.showEditForm = false;
    this.selectedRequestId = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.createForm.reset({
      requestType: 'LEAVE',
      title: '',
      reason: '',
      startDatetime: '',
      endDatetime: '',
    });
    this.showCreateForm = true;
  }

  cancelCreate(): void {
    this.showCreateForm = false;
    this.createForm.reset({
      requestType: 'LEAVE',
      title: '',
      reason: '',
      startDatetime: '',
      endDatetime: '',
    });
  }

  createRequest(submitAfterCreate: boolean): void {
    if (!this.currentEmployeeId || this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.value as {
      requestType: RequestsResponse['requestType'];
      title: string;
      reason: string;
      startDatetime: string;
      endDatetime: string;
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.requestsService.createRequest({
      employeeId: this.currentEmployeeId,
      requestType: value.requestType,
      title: value.title,
      reason: value.reason,
      startDatetime: this.toRequestDateTime(value.startDatetime),
      endDatetime: this.toRequestDateTime(value.endDatetime),
    }).subscribe({
      next: (created) => {
        if (!submitAfterCreate) {
          this.showCreateForm = false;
          this.successMessage = `Request ${created.requestId} created successfully.`;
          this.loadRequests();
          return;
        }

        this.submittingRequestId = created.requestId;
        this.requestsService.submitRequest(created.requestId).subscribe({
          next: () => {
            this.submittingRequestId = null;
            this.showCreateForm = false;
            this.successMessage = `Request ${created.requestId} created and submitted successfully.`;
            this.loadRequests();
          },
          error: (error: HttpErrorResponse) => {
            this.submittingRequestId = null;
            this.handleError(error, 'Request was created but could not be submitted.');
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.handleError(error, 'Unable to create request.');
      },
    });
  }

  openEdit(request: RequestsResponse): void {
    this.showCreateForm = false;
    this.selectedRequestId = request.requestId;
    this.errorMessage = '';
    this.successMessage = '';
    this.editForm.reset({
      requestType: request.requestType,
      title: request.title,
      reason: request.reason ?? '',
      startDatetime: this.toDatetimeLocal(request.startDatetime),
      endDatetime: this.toDatetimeLocal(request.endDatetime),
    });
    this.showEditForm = true;
  }

  cancelEdit(): void {
    this.showEditForm = false;
    this.selectedRequestId = null;
  }

  submitEdit(): void {
    if (!this.currentEmployeeId || !this.selectedRequestId || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const requestId = this.selectedRequestId;
    const value = this.editForm.value as {
      requestType: RequestsResponse['requestType'];
      title: string;
      reason: string;
      startDatetime: string;
      endDatetime: string;
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.requestsService.updateRequest(requestId, {
      employeeId: this.currentEmployeeId,
      requestType: value.requestType,
      title: value.title,
      reason: value.reason,
      startDatetime: this.toRequestDateTime(value.startDatetime),
      endDatetime: this.toRequestDateTime(value.endDatetime),
    }).subscribe({
      next: () => {
        this.showEditForm = false;
        this.selectedRequestId = null;
        this.successMessage = `Request ${requestId} updated successfully.`;
        this.loadRequests();
      },
      error: (error: HttpErrorResponse) => {
        this.handleError(error, 'Unable to update request.');
      },
    });
  }

  deleteRequest(request: RequestsResponse): void {
    const confirmed = window.confirm(`Delete request ${request.requestId}?`);
    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.requestsService.deleteRequest(request.requestId).subscribe({
      next: () => {
        this.successMessage = `Request ${request.requestId} deleted successfully.`;
        this.loadRequests();
      },
      error: (error: HttpErrorResponse) => {
        this.handleError(error, 'Unable to delete request.');
      },
    });
  }

  canEdit(request: RequestsResponse): boolean {
    return request.status === 'DRAFT' || request.status === 'SUBMITTED';
  }

  canDelete(request: RequestsResponse): boolean {
    return request.status === 'DRAFT';
  }

  canReview(request: RequestsResponse): boolean {
    return this.canApproveRequests && request.status === 'SUBMITTED';
  }

  trackByRequestId(_: number, request: RequestsResponse): number {
    return request.requestId;
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString();
  }

  private toDatetimeLocal(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    return value.replace('Z', '').substring(0, 16);
  }

  private toRequestDateTime(value: string): string {
    if (!value) {
      return '';
    }
    return value.length === 16 ? `${value}:00` : value;
  }

  private requestDateRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const start = this.parseRequestDateValue(control.get('startDatetime')?.value);
      const end = this.parseRequestDateValue(control.get('endDatetime')?.value);

      if (!start || !end) {
        return null;
      }

      return start <= end ? null : { invalidDateRange: true };
    };
  }

  private parseRequestDateValue(value: unknown): number | null {
    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  private handleError(error: HttpErrorResponse, fallback: string): void {
    this.successMessage = '';
    if (error.status === 403) {
      this.errorMessage = 'You do not have permission to perform this action.';
      return;
    }
    if (error.status === 400 || error.status === 422) {
      const message = error.error?.message || error.error?.error;
      this.errorMessage = message || fallback;
      return;
    }
    if (error.status >= 500) {
      this.errorMessage = 'A server error occurred. Please try again.';
      return;
    }
    this.errorMessage = fallback;
  }

}
