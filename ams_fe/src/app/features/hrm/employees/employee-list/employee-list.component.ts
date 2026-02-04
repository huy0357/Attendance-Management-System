import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EmployeeDto } from '../employee.model';
import { EmployeeService } from '../employee.service';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    DateFormatPipe,
  ],
  template: `
    <div class="min-h-screen bg-blue-50 p-4 w-full min-w-0">
      <div class="max-w-full mx-auto space-y-4 w-full min-w-0">
        <!-- Header Section -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="text-2xl font-semibold text-slate-800">Employee List</h1>
              <p class="text-slate-600 text-sm">Manage employee records in one place</p>
            </div>
            <button
              [routerLink]="['/hrm/employees/new']"
              class="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors duration-200"
            >
              <mat-icon class="mr-2 text-base">add</mat-icon>
              Add New Employee
            </button>
          </div>
        </div>

        <!-- Search and Filter Section -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div class="flex-1 max-w-lg">
              <label class="block text-sm font-medium text-slate-700 mb-1">Search by name</label>
              <div class="relative">
                <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</mat-icon>
                <input
                  matInput
                  [formControl]="keywordControl"
                  (keyup.enter)="applySearch()"
                  spellcheck="false"
                  placeholder="Search by name"
                  class="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                (click)="applySearch()"
                class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors duration-200"
              >
                <mat-icon class="mr-2 text-base">search</mat-icon>
                Search
              </button>
              <button
                (click)="refresh()"
                class="inline-flex items-center px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors duration-200"
              >
                <mat-icon class="mr-2 text-base">refresh</mat-icon>
                Refresh
              </button>
            </div>
          </div>
        </div>

        <!-- Table Section -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible relative w-full max-w-full min-w-0" [class.loading]="isLoading">
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

          <div class="desktop-table">
            <table
              mat-table
              [dataSource]="dataSource"
              matSort
              (matSortChange)="onSortChange($event)"
              class="mat-elevation-z1 table-fixed w-full"
            >
              <colgroup>
                <col style="width: 160px;" />
                <col style="width: 280px;" />
                <col style="width: 420px;" />
                <col style="width: 180px;" />
                <col style="width: 160px;" />
              </colgroup>
            <ng-container matColumnDef="employeeCode">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="cell-base cell-code text-center align-middle px-4 w-[160px]">Employee Code</th>
              <td mat-cell *matCellDef="let row" class="cell-base cell-code text-center align-middle px-4 w-[160px]">
                <div class="w-full flex items-center justify-center">
                  <span class="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {{ row.employeeCode || '-' }}
                  </span>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="fullName">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="cell-base cell-left cell-name align-middle">Full Name</th>
              <td mat-cell *matCellDef="let row" class="cell-base cell-left cell-name align-middle text-slate-900 font-semibold truncate" [title]="row.fullName || '-'">
                {{ row.fullName || '-' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="cell-base cell-left cell-email align-middle">Email</th>
              <td mat-cell *matCellDef="let row" class="cell-base cell-left cell-email align-middle truncate" [title]="row.email || '-'">
                <a *ngIf="row.email" href="mailto:{{ row.email }}" class="email-link" (click)="$event.stopPropagation()">{{ row.email }}</a>
                <span *ngIf="!row.email" class="text-sm text-slate-500">-</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="phone">
              <th mat-header-cell *matHeaderCellDef class="cell-base cell-center cell-phone align-middle">Phone Number</th>
              <td mat-cell *matCellDef="let row" class="cell-base cell-center cell-phone align-middle">{{ row.phone || '-' }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="cell-base cell-status text-center align-middle px-4 w-[160px]">Status</th>
              <td mat-cell *matCellDef="let row" class="cell-base cell-status text-center align-middle px-4 w-[160px]">
                <div class="w-full flex items-center justify-center">
                  <span *ngIf="row.status" class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold"
                        [class]="row.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'">
                    {{ row.status }}
                  </span>
                  <span *ngIf="!row.status" class="text-sm text-slate-500">-</span>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns" class="border-b border-slate-200"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: displayedColumns"
              class="transition-colors employee-row"
              (click)="goToEmployeeDetail(row)"
            ></tr>
            </table>
          </div>

          <div class="mobile-cards">
            <div
              *ngFor="let emp of dataSource.data"
              class="employee-card employee-row"
              (click)="goToEmployeeDetail(emp)"
            >
              <div class="card-row">
                <span class="card-label">Employee Code</span>
                <span class="card-value">
                  <span class="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {{ emp.employeeCode || '-' }}
                  </span>
                </span>
              </div>
              <div class="card-row">
                <span class="card-label">Full Name</span>
                <span class="card-value font-semibold text-slate-900" [title]="emp.fullName || '-'">{{ emp.fullName || '-' }}</span>
              </div>
              <div class="card-row">
                <span class="card-label">Email</span>
                <span class="card-value email-wrap">
                  <a *ngIf="emp.email" href="mailto:{{ emp.email }}" class="email-link" (click)="$event.stopPropagation()">{{ emp.email }}</a>
                  <span *ngIf="!emp.email" class="text-sm text-slate-500">-</span>
                </span>
              </div>
              <div class="card-row">
                <span class="card-label">Phone Number</span>
                <span class="card-value">{{ emp.phone || '-' }}</span>
              </div>
              <div class="card-row">
                <span class="card-label">Status</span>
                <span class="card-value">
                  <span *ngIf="emp.status" class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold"
                        [class]="emp.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'">
                    {{ emp.status }}
                  </span>
                  <span *ngIf="!emp.status" class="text-sm text-slate-500">-</span>
                </span>
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="!isLoading && dataSource.data.length === 0">
            <div class="flex flex-col items-center justify-center py-12">
              <mat-icon class="text-5xl text-slate-300 mb-3">people_outline</mat-icon>
              <h3 class="text-lg font-semibold text-slate-700 mb-2">No employees found</h3>
              <p class="text-slate-500 text-center max-w-sm text-sm">Add your first employee or adjust your search criteria.</p>
              <button
                [routerLink]="['/hrm/employees/new']"
                class="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors duration-200"
              >
                <mat-icon class="mr-2 text-base">add</mat-icon>
                Add New Employee
              </button>
            </div>
          </div>

          <!-- Pagination Section -->
          <div class="p-4 border-t border-slate-200 bg-slate-50/60">
            <mat-paginator
              [length]="totalItems"
              [pageIndex]="pageIndex"
              [pageSize]="pageSize"
              [pageSizeOptions]="[5, 10, 20]"
              (page)="onPageChange($event)"
              class="mb-3"
            ></mat-paginator>

            <div class="pager-actions">
              <button
                mat-stroked-button
                (click)="goPrev()"
                [disabled]="!hasPrev"
                class="inline-flex items-center px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <mat-icon class="mr-2 text-base">chevron_left</mat-icon>
                Previous
              </button>
              <button
                mat-stroked-button
                (click)="goNext()"
                [disabled]="!hasNext"
                class="inline-flex items-center px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <mat-icon class="ml-2 text-base">chevron_right</mat-icon>
              </button>
            </div>
          </div>
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
      :host ::ng-deep .mat-mdc-paginator-container {
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
      .pager-actions {
        display: flex;
        justify-content: center;
        gap: 0.75rem;
      }
      .desktop-table {
        width: 100%;
        overflow-x: auto;
        overflow-y: visible;
      }
      .mobile-cards {
        display: none;
        overflow-x: auto;
        overflow-y: visible;
      }
      table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: fixed;
      }
      .mat-mdc-header-row {
        background: #f8fafc;
      }
      .mat-mdc-row:nth-child(even) {
        background-color: #f8fafc;
      }
      .mat-mdc-row:hover {
        background-color: #eff6ff !important;
      }
      .mat-mdc-header-row,
      .mat-mdc-row {
        height: 3.5rem;
      }
      .cell-base {
        padding: 0.75rem 1rem;
        border-top: 1px solid #e2e8f0;
        font-size: 0.875rem;
        color: #334155;
        white-space: nowrap;
        overflow: visible;
        text-overflow: clip;
      }
      .mat-mdc-header-row .cell-base {
        background: #f8fafc;
        font-weight: 600;
        color: #475569;
        line-height: 1.5;
        overflow: visible;
        vertical-align: middle;
      }
      :host ::ng-deep .mat-sort-header-container,
      :host ::ng-deep .mat-sort-header-content {
        overflow: visible;
      }
      :host ::ng-deep .mat-mdc-header-cell,
      :host ::ng-deep .mat-mdc-cell,
      :host ::ng-deep .mat-mdc-header-row,
      :host ::ng-deep .mat-mdc-row,
      :host ::ng-deep .mat-mdc-table {
        overflow: visible;
      }
      .cell-center {
        text-align: center;
      }
      .cell-left {
        text-align: left;
      }
      .cell-id {
        width: 4rem;
        min-width: 4rem;
      }
      .cell-code {
        width: 10rem;
        min-width: 10rem;
      }
      .cell-name {
        width: 17.5rem;
        min-width: 17.5rem;
      }
      .cell-email {
        width: 26.25rem;
        min-width: 26.25rem;
      }
      .cell-phone {
        width: 11.25rem;
        min-width: 11.25rem;
      }
      .cell-date {
        width: 8rem;
        min-width: 8rem;
      }
      .cell-gender {
        width: 6rem;
        min-width: 6rem;
      }
      .cell-short {
        width: 7rem;
        min-width: 7rem;
      }
      .cell-status {
        width: 10rem;
        min-width: 10rem;
      }
      .mat-column-employeeCode {
        width: 10rem;
      }
      .mat-column-fullName {
        width: 18rem;
      }
      .mat-column-email {
        width: 22rem;
      }
      .mat-column-phone {
        width: 11rem;
      }
      .mat-column-status {
        width: 9rem;
      }
      .mat-column-email .cell-base {
        white-space: normal;
        word-break: break-word;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .icon-action {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.5rem;
        border: 1px solid #e2e8f0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: background-color 150ms, color 150ms, box-shadow 150ms;
      }
      .icon-action:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.5);
      }
      .email-link {
        display: inline-block;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #2563eb;
      }
      .email-link:hover {
        color: #1d4ed8;
        text-decoration: underline;
      }
      .employee-card {
        border-top: 1px solid #e2e8f0;
        padding: 1rem 1.25rem;
      }
      .employee-row {
        cursor: pointer;
      }
      .employee-row:hover {
        background-color: #eff6ff;
      }
      .card-row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.35rem 0;
      }
      .card-label {
        font-size: 0.75rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        flex: 0 0 40%;
      }
      .card-value {
        text-align: right;
        color: #334155;
        font-size: 0.875rem;
        flex: 1 1 auto;
        min-width: 0;
        white-space: normal;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .email-wrap {
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      @media (max-width: 992px) {
        .desktop-table {
          display: none;
        }
        .mobile-cards {
          display: block;
        }
      }
      @media (max-width: 768px) {
        .employee-card {
          padding: 0.85rem 1rem;
        }
        .card-label {
          flex-basis: 42%;
        }
        .cell-base {
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
        }
        .mat-mdc-header-row,
        .mat-mdc-row {
          height: 3rem;
        }
      }
      button, .btn, [mat-button], [mat-raised-button], [mat-stroked-button], [mat-flat-button] {
        text-decoration: none !important;
      }
      button:hover, .btn:hover, [mat-button]:hover, [mat-raised-button]:hover, [mat-stroked-button]:hover, [mat-flat-button]:hover {
        text-decoration: none !important;
      }
    `,
  ],
})
export class EmployeeListComponent implements OnInit, OnDestroy {
  displayedColumns = [
    'employeeCode',
    'fullName',
    'email',
    'phone',
    'status',
  ];
  dataSource = new MatTableDataSource<EmployeeDto>([]);
  keywordControl = new FormControl('');
  isLoading = false;
  errorMessage: string | null = null;
  totalItems = 0;
  pageIndex = 0;
  pageSize = 10;
  sortBy = 'employee_id';
  sortDir: 'asc' | 'desc' = 'desc';
  hasPrev = false;
  hasNext = false;

  private readonly sortFieldMap: Record<string, string> = {
    employeeId: 'employee_id',
    employeeCode: 'employee_code',
    fullName: 'full_name',
    email: 'email',
    status: 'status',
    departmentId: 'department_id',
    positionId: 'position_id',
    managerId: 'manager_id',
    hireDate: 'hire_date',
    dob: 'dob',
    createdAt: 'created_at',
  };

  private readonly destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  constructor(
    private employeeService: EmployeeService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applySearch(): void {
    this.pageIndex = 0;
    this.loadEmployees();
  }

  refresh(): void {
    this.keywordControl.setValue('');
    this.pageIndex = 0;
    this.loadEmployees();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadEmployees();
  }

  onSortChange(sort: Sort): void {
    if (!sort.direction) {
      this.sortBy = 'employee_id';
      this.sortDir = 'desc';
    } else {
      this.sortBy = this.sortFieldMap[sort.active] || 'employee_id';
      this.sortDir = sort.direction;
    }
    this.loadEmployees();
  }

  goPrev(): void {
    if (!this.hasPrev || this.pageIndex === 0) {
      return;
    }
    this.pageIndex -= 1;
    this.loadEmployees();
  }

  goNext(): void {
    if (!this.hasNext) {
      return;
    }
    this.pageIndex += 1;
    this.loadEmployees();
  }

  goToEmployeeDetail(employee: EmployeeDto): void {
    this.router.navigate(['/hrm/employees', employee.employeeId, 'detail']);
  }

  confirmDelete(employee: EmployeeDto): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Employee',
        message: `Are you sure you want to delete employee ${employee.fullName || ''}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.deleteEmployee(employee.employeeId);
        }
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
          this.loadEmployees();
        },
        error: (error) => {
          this.isLoading = false;
          const message =
            error?.error?.message || error?.message || 'Unable to delete employee';
          this.snackBar.open(message, 'Close', { duration: 4000 });
        },
      });
  }

  private loadEmployees(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const query = {
      page: this.pageIndex + 1,
      size: this.pageSize,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
    };
    const keyword = (this.keywordControl.value || '').trim();
    const request$ = keyword
      ? this.employeeService.searchByName(keyword, query)
      : this.employeeService.getPage(query);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.dataSource.data = response.items;
        this.totalItems = response.totalItems;
        this.pageIndex = response.page - 1;
        this.pageSize = response.size;
        this.hasPrev = response.hasPrev;
        this.hasNext = response.hasNext;

        const lastPage = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
        if (this.totalItems > 0 && this.pageIndex + 1 > lastPage) {
          this.pageIndex = lastPage - 1;
          this.isLoading = false;
          this.loadEmployees();
          return;
        }

        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error?.error?.message || error?.message || 'Unable to load employee data';
      },
    });
  }
}
