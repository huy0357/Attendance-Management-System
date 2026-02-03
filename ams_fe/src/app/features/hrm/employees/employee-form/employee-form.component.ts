import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { EmployeeDto, EmployeeRequest } from '../employee.model';
import { EmployeeService } from '../employee.service';
import { mapBackendErrorsToForm } from '../employee-form.utils';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    DateFormatPipe,
  ],
  template: `
    <div class="min-h-screen bg-blue-50 p-4">
      <div class="max-w-5xl mx-auto space-y-4">
        <!-- Header Section -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="text-2xl font-semibold text-slate-800">
                {{ isEditMode ? 'Edit Employee' : 'Add New Employee' }}
              </h1>
              <p class="text-slate-600 text-sm" *ngIf="employee">
                Created at: {{ employee.createdAt | dateFormat }}
              </p>
            </div>
            <div class="actions">
              <button
                routerLink="/hrm/employees"
                class="inline-flex items-center px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors duration-200"
              >
                <mat-icon class="mr-2 text-base">arrow_back</mat-icon>
                Back
              </button>
              <button
                *ngIf="isEditMode"
                (click)="toggleEdit()"
                class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors duration-200"
              >
                <mat-icon class="mr-2 text-base">{{ isReadOnly ? 'edit' : 'visibility' }}</mat-icon>
                {{ isReadOnly ? 'Edit' : 'View' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Form Section -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative" [class.loading]="isLoading">
          <div class="loading-overlay" *ngIf="isLoading">
            <div class="flex flex-col items-center justify-center">
              <mat-spinner diameter="32"></mat-spinner>
              <p class="mt-2 text-slate-600 text-sm">Loading...</p>
            </div>
          </div>

          <div class="error-state" *ngIf="errorMessage && !isLoading">
            <div class="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg mx-4 mt-3">
              <mat-icon class="text-red-600 mr-2 text-sm">error</mat-icon>
              <span class="text-red-800 text-sm">{{ errorMessage }}</span>
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-6">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Employee Code</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="employeeCode" spellcheck="false" class="h-11" />
                  <mat-error *ngIf="hasError('employeeCode')">
                    {{ getError('employeeCode') }}
                  </mat-error>
                </mat-form-field>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="fullName" spellcheck="false" class="h-11" />
                  <mat-error *ngIf="hasError('fullName')">
                    {{ getError('fullName') }}
                  </mat-error>
                </mat-form-field>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="email" spellcheck="false" class="h-11" />
                  <mat-error *ngIf="hasError('email')">
                    {{ getError('email') }}
                  </mat-error>
                </mat-form-field>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="phone" spellcheck="false" class="h-11" />
                  <mat-error *ngIf="hasError('phone')">
                    {{ getError('phone') }}
                  </mat-error>
                </mat-form-field>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput [matDatepicker]="dobPicker" formControlName="dob" class="h-11" />
                  <mat-datepicker-toggle matSuffix [for]="dobPicker" class="text-blue-600"></mat-datepicker-toggle>
                  <mat-datepicker #dobPicker></mat-datepicker>
                  <mat-error *ngIf="hasError('dob')">
                    {{ getError('dob') }}
                  </mat-error>
                </mat-form-field>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="gender" spellcheck="false" class="h-11" />
                  <mat-error *ngIf="hasError('gender')">
                    {{ getError('gender') }}
                  </mat-error>
                </mat-form-field>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Department ID</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput type="number" formControlName="departmentId" spellcheck="false" class="h-11" />
                  <mat-error *ngIf="hasError('departmentId')">
                    {{ getError('departmentId') }}
                  </mat-error>
                </mat-form-field>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Position ID</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput type="number" formControlName="positionId" spellcheck="false" class="h-11" />
                  <mat-error *ngIf="hasError('positionId')">
                    {{ getError('positionId') }}
                  </mat-error>
                </mat-form-field>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Manager ID</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput type="number" formControlName="managerId" spellcheck="false" class="h-11" />
                  <mat-error *ngIf="hasError('managerId')">
                    {{ getError('managerId') }}
                  </mat-error>
                </mat-form-field>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Hire Date</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput [matDatepicker]="hireDatePicker" formControlName="hireDate" class="h-11" />
                  <mat-datepicker-toggle matSuffix [for]="hireDatePicker" class="text-blue-600"></mat-datepicker-toggle>
                  <mat-datepicker #hireDatePicker></mat-datepicker>
                  <mat-error *ngIf="hasError('hireDate')">
                    {{ getError('hireDate') }}
                  </mat-error>
                </mat-form-field>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <div class="h-11 flex items-center">
                  <span class="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-semibold">
                    {{ employee?.status || 'ACTIVE' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="form-actions mt-8 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                [disabled]="form.invalid || isLoading || isReadOnly"
                class="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 shadow-sm"
              >
                <mat-icon class="mr-2 text-base">save</mat-icon>
                Save
              </button>
              <button
                type="button"
                routerLink="/hrm/employees"
                class="inline-flex items-center px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host ::ng-deep .mat-mdc-form-field-focus-overlay {
        background-color: #dbeafe !important;
      }
      :host ::ng-deep .mat-mdc-form-field-flex {
        border-color: #cbd5e1 !important;
      }
      :host ::ng-deep .mat-mdc-form-field-focus .mat-mdc-form-field-flex {
        border-color: #2563eb !important;
      }
      :host ::ng-deep .mat-mdc-text-field-wrapper {
        border-radius: 0.5rem !important;
      }
      :host ::ng-deep .mat-mdc-form-field-icon-prefix,
      :host ::ng-deep .mat-mdc-form-field-icon-suffix,
      :host ::ng-deep .mdc-text-field__affix {
        border-left: none !important;
        border-right: none !important;
      }
      :host ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        padding: 0 0.75rem 0.5rem;
      }
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
      .actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      /* Fix strikethrough text on buttons */
      button, .btn, [mat-button], [mat-raised-button], [mat-stroked-button], [mat-flat-button] {
        text-decoration: none !important;
      }
      button:hover, .btn:hover, [mat-button]:hover, [mat-raised-button]:hover, [mat-stroked-button]:hover, [mat-flat-button]:hover {
        text-decoration: none !important;
      }
    `,
  ],
})
export class EmployeeFormComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isEditMode = false;
  isReadOnly = false;
  isLoading = false;
  errorMessage: string | null = null;
  employee: EmployeeDto | null = null;

  private employeeId: number | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      employeeCode: [''],
      fullName: [''],
      dob: [null, [this.pastDateValidator]],
      gender: [''],
      phone: ['', [Validators.pattern(/^0\d{9}$/)]],
      email: ['', [Validators.email]],
      departmentId: [null],
      positionId: [null],
      managerId: [null],
      hireDate: [null],
    });
  }

  ngOnInit(): void {
    this.registerBackendErrorReset();
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const idParam = params.get('id');
      if (idParam) {
        this.isEditMode = true;
        this.isReadOnly = true;
        this.employeeId = Number(idParam);
        if (Number.isNaN(this.employeeId)) {
          this.errorMessage = 'Invalid ID';
          return;
        }
        this.loadEmployee(this.employeeId);
      } else {
        this.isEditMode = false;
        this.isReadOnly = false;
        this.employeeId = null;
        this.employee = null;
        this.form.reset();
        this.form.enable();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleEdit(): void {
    this.isReadOnly = !this.isReadOnly;
    this.applyReadOnlyState();
  }

  hasError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getError(controlName: string): string {
    const control = this.form.get(controlName);
    if (!control || !control.errors) {
      return '';
    }

    if (control.errors['backend']) {
      return control.errors['backend'];
    }

    if (control.errors['email']) {
      return 'Invalid email format';
    }

    if (control.errors['pattern']) {
      return 'Phone number must start with 0 and have 10 digits';
    }

    if (control.errors['pastDate']) {
      return 'Date of birth must be in the past';
    }

    return 'Invalid value';
  }

  onSubmit(): void {
    if (this.isReadOnly) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const payload = this.buildPayload();
    this.isLoading = true;
    this.errorMessage = null;

    if (this.isEditMode && this.employeeId !== null) {
      this.employeeService
        .update(this.employeeId, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Employee updated successfully', 'Close', {
              duration: 3000,
            });
            this.router.navigate(['/hrm/employees']);
          },
          error: (error) => {
            this.handleError(error);
          },
        });
    } else {
      this.employeeService
        .create(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Employee created successfully', 'Close', {
              duration: 3000,
            });
            this.router.navigate(['/hrm/employees']);
          },
          error: (error) => {
            this.handleError(error);
          },
        });
    }
  }

  private loadEmployee(id: number): void {
    this.isLoading = true;
    this.employeeService
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employee) => {
          this.employee = employee;
          this.patchForm(employee);
          this.applyReadOnlyState();
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage =
            error?.error?.message || error?.message || 'Unable to load employee';
        },
      });
  }

  private patchForm(employee: EmployeeDto): void {
    this.form.patchValue({
      employeeCode: employee.employeeCode || '',
      fullName: employee.fullName || '',
      dob: employee.dob ? new Date(employee.dob) : null,
      gender: employee.gender || '',
      phone: employee.phone || '',
      email: employee.email || '',
      departmentId: employee.departmentId ?? null,
      positionId: employee.positionId ?? null,
      managerId: employee.managerId ?? null,
      hireDate: employee.hireDate ? new Date(employee.hireDate) : null,
    });
  }

  private applyReadOnlyState(): void {
    if (this.isReadOnly) {
      this.form.disable();
      return;
    }

    this.form.enable();
    if (this.isEditMode) {
      return;
    }
  }

  private registerBackendErrorReset(): void {
    Object.keys(this.form.controls).forEach((controlName) => {
      const control = this.form.get(controlName);
      if (!control) {
        return;
      }
      control.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
        const errors = control.errors;
        if (errors && errors['backend']) {
          const { backend, ...rest } = errors;
          control.setErrors(Object.keys(rest).length ? rest : null);
        }
      });
    });
  }

  private buildPayload(): EmployeeRequest {
    const raw = this.form.getRawValue();
    const payload: EmployeeRequest = {
      employeeCode: raw.employeeCode || null,
      fullName: raw.fullName || null,
      dob: this.toDateString(raw.dob),
      gender: raw.gender || null,
      phone: raw.phone || null,
      email: raw.email || null,
      departmentId: raw.departmentId ?? null,
      positionId: raw.positionId ?? null,
      managerId: raw.managerId ?? null,
      hireDate: this.toDateString(raw.hireDate),
    };

    return payload;
  }

  private toDateString(value: Date | null): string | null {
    if (!value) {
      return null;
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private handleError(error: unknown): void {
    this.isLoading = false;
    const mappedMessage = mapBackendErrorsToForm(this.form, error);
    const fallbackMessage =
      (error as { error?: { message?: string } })?.error?.message ||
      (error as { message?: string })?.message ||
      null;
    const message = mappedMessage || fallbackMessage;
    this.errorMessage = message;
    if (message) {
      this.snackBar.open(message, 'Dong', { duration: 4000 });
    }
  }

  private pastDateValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value as Date | null;
    if (!value) {
      return null;
    }
    const today = new Date();
    const normalized = new Date(value);
    normalized.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return normalized < today ? null : { pastDate: true };
  }
}
