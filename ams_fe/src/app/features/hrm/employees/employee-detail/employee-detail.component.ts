import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { EmployeeDto } from '../employee.model';
import { EmployeeService } from '../employee.service';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    DateFormatPipe,
  ],
  template: `
    <div class="min-h-screen bg-blue-50 p-4 w-full min-w-0">
      <div class="max-w-5xl mx-auto space-y-4 w-full min-w-0">
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="text-2xl font-semibold text-slate-800">Employee Detail</h1>
              <p class="text-slate-600 text-sm" *ngIf="employee">
                Employee Code: {{ employee.employeeCode || '-' }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                routerLink="/hrm/employees"
                class="inline-flex items-center px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors duration-200"
              >
                <mat-icon class="mr-2 text-base">arrow_back</mat-icon>
                Back
              </button>
              <button
                *ngIf="employeeId !== null"
                [routerLink]="['/hrm/employees', employeeId]"
                class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors duration-200"
              >
                <mat-icon class="mr-2 text-base">edit</mat-icon>
                Edit
              </button>
              <button
                *ngIf="employeeId !== null"
                (click)="confirmDelete()"
                class="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-sm transition-colors duration-200"
              >
                <mat-icon class="mr-2 text-base">delete</mat-icon>
                Delete
              </button>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative w-full max-w-full min-w-0" [class.loading]="isLoading">
          <div class="loading-overlay" *ngIf="isLoading">
            <div class="flex flex-col items-center justify-center">
              <mat-spinner diameter="32"></mat-spinner>
              <p class="mt-2 text-slate-600 text-sm">Loading...</p>
            </div>
          </div>

          <div class="error-state" *ngIf="errorMessage && !isLoading">
            <div class="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg mx-4 mt-4">
              <mat-icon class="text-red-600 mr-2 text-sm">error</mat-icon>
              <span class="text-red-800 text-sm">{{ errorMessage }}</span>
            </div>
          </div>

          <div class="p-6 space-y-6" *ngIf="employee">
            <div>
              <h2 class="text-base font-semibold text-slate-800 mb-4">Basic Info</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p class="label">Employee Code</p>
                  <p class="value">{{ employee.employeeCode || '-' }}</p>
                </div>
                <div>
                  <p class="label">Full Name</p>
                  <p class="value">{{ employee.fullName || '-' }}</p>
                </div>
                <div>
                  <p class="label">Email</p>
                  <a *ngIf="employee.email" class="value link" href="mailto:{{ employee.email }}">{{ employee.email }}</a>
                  <p *ngIf="!employee.email" class="value">-</p>
                </div>
                <div>
                  <p class="label">Phone Number</p>
                  <a *ngIf="employee.phone" class="value link" href="tel:{{ employee.phone }}">{{ employee.phone }}</a>
                  <p *ngIf="!employee.phone" class="value">-</p>
                </div>
                <div>
                  <p class="label">Gender</p>
                  <p class="value">{{ displayGender(employee.gender) }}</p>
                </div>
                <div>
                  <p class="label">Date of Birth</p>
                  <p class="value">{{ employee.dob | dateFormat }}</p>
                </div>
              </div>
            </div>

            <div>
              <h2 class="text-base font-semibold text-slate-800 mb-4">Org Info</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p class="label">Department ID</p>
                  <p class="value">{{ employee.departmentId ?? '-' }}</p>
                </div>
                <div>
                  <p class="label">Position ID</p>
                  <p class="value">{{ employee.positionId ?? '-' }}</p>
                </div>
                <div>
                  <p class="label">Manager ID</p>
                  <p class="value">{{ employee.managerId ?? '-' }}</p>
                </div>
              </div>
            </div>

            <div>
              <h2 class="text-base font-semibold text-slate-800 mb-4">Employment</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p class="label">Hire Date</p>
                  <p class="value">{{ employee.hireDate | dateFormat }}</p>
                </div>
                <div>
                  <p class="label">Status</p>
                  <span class="status-pill"
                        [class]="employee.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-800'">
                    {{ employee.status || '-' }}
                  </span>
                </div>
                <div>
                  <p class="label">Created</p>
                  <p class="value">{{ employee.createdAt | dateFormat }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .loading-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.9);
        z-index: 10;
        backdrop-filter: blur(1px);
      }
      .label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #64748b;
        margin-bottom: 0.25rem;
      }
      .value {
        font-size: 0.95rem;
        color: #0f172a;
        font-weight: 600;
      }
      .link {
        color: #2563eb;
        text-decoration: none;
      }
      .link:hover {
        color: #1d4ed8;
        text-decoration: underline;
      }
      .status-pill {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
      }
    `,
  ],
})
export class EmployeeDetailComponent implements OnInit, OnDestroy {
  employee: EmployeeDto | null = null;
  employeeId: number | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const idParam = params.get('id');
      if (!idParam) {
        this.errorMessage = 'Invalid ID';
        return;
      }
      const parsed = Number(idParam);
      if (Number.isNaN(parsed)) {
        this.errorMessage = 'Invalid ID';
        return;
      }
      this.employeeId = parsed;
      this.loadEmployee(parsed);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  confirmDelete(): void {
    if (this.employeeId === null) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Employee',
        message: `Are you sure you want to delete employee ${this.employee?.fullName || ''}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.deleteEmployee(this.employeeId as number);
        }
      });
  }

  displayGender(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }
    if (value === 'nam') {
      return 'Male';
    }
    if (value === 'nữ') {
      return 'Female';
    }
    return value;
  }

  private loadEmployee(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.employeeService
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employee) => {
          this.employee = employee;
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage =
            error?.error?.message || error?.message || 'Unable to load employee';
        },
      });
  }

  private deleteEmployee(id: number): void {
    this.isLoading = true;
    this.employeeService
      .delete(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Employee deleted successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/hrm/employees']);
        },
        error: (error) => {
          this.isLoading = false;
          const message =
            error?.error?.message || error?.message || 'Unable to delete employee';
          this.snackBar.open(message, 'Close', { duration: 4000 });
        },
      });
  }
}
