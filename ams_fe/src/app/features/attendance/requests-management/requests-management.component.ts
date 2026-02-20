import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceService } from '../attendance.service';
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

  editForm: FormGroup;
  showEditForm = false;
  selectedRequestId: number | null = null;

  constructor(
    private attendanceService: AttendanceService,
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
    this.attendanceService.getRequestsByEmployee(this.selectedEmployeeId).subscribe({
      next: (data) => {
        this.requests = data;
        this.isLoading = false;
      },
      error: () => {
        this.requests = [];
        this.isLoading = false;
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
    this.attendanceService.updateRequest(this.selectedRequestId, {
      employeeId: this.selectedEmployeeId,
      requestType: value.requestType,
      title: value.title,
      reason: value.reason,
      startDatetime: value.startDatetime,
      endDatetime: value.endDatetime,
    }).subscribe({
      next: () => {
        this.showEditForm = false;
        this.selectedRequestId = null;
        this.onSelectEmployee();
      },
      error: () => {
        this.errorMessage = 'Unable to update request.';
      },
    });
  }

  deleteRequest(request: RequestsResponse): void {
    const confirmed = window.confirm(`Delete request ${request.requestId}?`);
    if (!confirmed) return;
    this.attendanceService.deleteRequest(request.requestId).subscribe({
      next: () => {
        this.onSelectEmployee();
      },
      error: () => {
        this.errorMessage = 'Unable to delete request.';
      },
    });
  }

  private toDatetimeLocal(value: string): string {
    if (!value) return '';
    return value.replace('Z', '').substring(0, 16);
  }
}
