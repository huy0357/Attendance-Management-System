import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RequestsService } from '../../../core/services/requests.service';
import { EmployeeService, EmployeeDto } from '../../hrm/employees/employee.service';
import { RequestsResponse } from '../../../shared/models/requests.model';

@Component({
  standalone: false,
  selector: 'app-requests-management',
  templateUrl: './requests-management.component.html',
  styleUrls: ['./requests-management.component.scss'],
})
export class RequestsManagementComponent implements OnInit {
  employees: EmployeeDto[] = [];
  requests: RequestsResponse[] = [];
  selectedEmployeeId: number | null = null;

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  submittingRequestId: number | null = null;

  editForm: FormGroup;
  showEditForm = false;
  selectedRequestId: number | null = null;

  constructor(
    private requestsService: RequestsService,
    private employeeService: EmployeeService,
    private fb: FormBuilder,
  ) {
    this.editForm = this.fb.group({
      requestType: ['', Validators.required],
      title: ['', Validators.required],
      reason: [''],
      startDatetime: ['', Validators.required],
      endDatetime: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.employeeService.getAll().subscribe({
      next: (data) => {
        this.employees = data;
      },
      error: () => {
        this.employees = [];
      },
    });
  }

  onSelectEmployee(): void {
    if (!this.selectedEmployeeId) {
      this.requests = [];
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.requestsService.getMyRequests(this.selectedEmployeeId).subscribe({
      next: (data: RequestsResponse[]) => {
        this.requests = data;
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.requests = [];
        this.isLoading = false;
        this.handleError(error, 'Unable to load requests.');
      },
    });
  }

  submitRequest(request: RequestsResponse): void {
    if (!this.selectedEmployeeId || request.status !== 'DRAFT' || this.submittingRequestId === request.requestId) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.submittingRequestId = request.requestId;

    this.requestsService.submitRequest(request.requestId).subscribe({
      next: () => {
        this.requestsService.getMyRequests(this.selectedEmployeeId as number).subscribe({
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

  openEdit(request: RequestsResponse): void {
    this.selectedRequestId = request.requestId;
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
    if (!this.selectedEmployeeId || !this.selectedRequestId || this.editForm.invalid) {
      return;
    }
    const value = this.editForm.value as {
      requestType: RequestsResponse['requestType'];
      title: string;
      reason: string;
      startDatetime: string;
      endDatetime: string;
    };
    this.errorMessage = '';
    this.requestsService.updateRequest(this.selectedRequestId, {
      employeeId: this.selectedEmployeeId,
      requestType: value.requestType,
      title: value.title,
      reason: value.reason,
      startDatetime: this.toRequestDateTime(value.startDatetime),
      endDatetime: this.toRequestDateTime(value.endDatetime),
    }).subscribe({
      next: () => {
        this.showEditForm = false;
        this.selectedRequestId = null;
        this.onSelectEmployee();
      },
      error: (error: HttpErrorResponse) => {
        this.handleError(error, 'Unable to update request.');
      },
    });
  }

  deleteRequest(request: RequestsResponse): void {
    const confirmed = window.confirm(`Delete request ${request.requestId}?`);
    if (!confirmed) return;
    this.errorMessage = '';
    this.requestsService.deleteRequest(request.requestId).subscribe({
      next: () => {
        this.onSelectEmployee();
      },
      error: (error: HttpErrorResponse) => {
        this.handleError(error, 'Unable to delete request.');
      },
    });
  }

  private toDatetimeLocal(value: string): string {
    if (!value) return '';
    return value.replace('Z', '').substring(0, 16);
  }

  canEdit(request: RequestsResponse): boolean {
    return request.status === 'DRAFT' || request.status === 'SUBMITTED';
  }

  canDelete(request: RequestsResponse): boolean {
    return request.status === 'DRAFT';
  }

  private toRequestDateTime(value: string): string {
    if (!value) return '';
    return value.length === 16 ? `${value}:00` : value;
  }

  private handleError(error: HttpErrorResponse, fallback: string): void {
    if (error.status === 403) {
      this.errorMessage = 'Không có quyền';
      return;
    }
    if (error.status === 400 || error.status === 422) {
      const message = error.error?.message || error.error?.error;
      this.errorMessage = message || fallback;
      return;
    }
    if (error.status >= 500) {
      this.errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.';
      return;
    }
    this.errorMessage = fallback;
  }
}
