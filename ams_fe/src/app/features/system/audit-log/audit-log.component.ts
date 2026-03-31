import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';
import { AuditLog, AuditLogFilter, PageResponse } from './audit-log.model';
import { EmployeeService, EmployeeDto } from '../../hrm/employees/employee.service';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.scss'],
  providers: [DatePipe]
})
export class AuditLogComponent implements OnInit, OnDestroy {
  logs: AuditLog[] = [];
  employees: EmployeeDto[] = [];
  employeesMap = new Map<number, EmployeeDto>();

  isLoading = false;
  totalElements = 0;
  totalPages = 0;
  currentPage = 1;
  pageSize = 10;

  private destroy$ = new Subject<void>();
  
  // UI State
  searchQuery = '';
  selectedModule = '';
  selectedAction = '';
  dateRangeStart = '';
  dateRangeEnd = '';

  // Modal
  isModalOpen = false;
  selectedLog: AuditLog | null = null;
  formattedOldValue = '';
  formattedNewValue = '';

  modules = ['System', 'Attendance', 'Employee', 'Leave', 'Overtime', 'Department', 'Position'];
  actions = [
    'CREATE',
    'ADD',
    'REGISTER',
    'UPDATE',
    'EDIT',
    'SUBMIT',
    'REFRESH_TOKEN',
    'DELETE',
    'REMOVE',
    'LOGIN',
    'LOGOUT',
  ];

  Math = Math;

  private filter: AuditLogFilter = {
    page: 1,
    size: 10,
    sortBy: 'createdAt',
    sortDir: 'desc',
  };

  constructor(
    private auditLogService: AuditLogService,
    private employeeService: EmployeeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // IMPORTANT: Fetch logs immediately with default filters (All Actions, All Modules, no date range limit).
    // UI should render even if employee mapping API is slow/failed.
    this.resetFiltersAndFetch();

    this.employeeService.getAll().pipe(
      takeUntil(this.destroy$),
      catchError(() => of([]))
    ).subscribe((emps) => {
      this.employees = emps;
      emps.forEach(emp => this.employeesMap.set(emp.employeeId, emp));
      // Refresh labels (name/email) once employee mapping is ready.
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resetFiltersAndFetch(): void {
    this.searchQuery = '';
    this.selectedModule = '';
    this.selectedAction = '';
    this.dateRangeStart = this.dateRangeStart || '';
    this.dateRangeEnd = this.dateRangeEnd || '';

    this.currentPage = 1;
    this.pageSize = this.pageSize || 10;

    this.filter = {
      page: this.currentPage,
      size: this.pageSize,
      sortBy: 'createdAt',
      sortDir: 'desc',
    };

    this.fetchData();
  }

  private fetchData(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.auditLogService.getAuditLogs(this.filter).pipe(
      takeUntil(this.destroy$),
      catchError(() => {
        this.logs = [];
        this.totalElements = 0;
        this.totalPages = 0;
        this.isLoading = false;
        this.cdr.detectChanges();
        return of({ items: [], content: [], data: [], totalElements: 0, totalItems: 0, totalPages: 0, page: 1, size: this.pageSize } as PageResponse<AuditLog>);
      })
    ).subscribe((response) => {
      this.totalElements = response.totalElements ?? response.totalItems ?? 0;
      this.totalPages = response.totalPages ?? 0;
      this.logs = response.items || response.content || response.data || [];
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  getEmployeeName(actorId: number): string {
    const emp = this.employeesMap.get(actorId);
    return emp ? (emp.fullName || `Actor ${actorId}`) : `System/Unknown (${actorId})`;
  }

  getEmployeeIdentity(actorId: number): string {
    const emp = this.employeesMap.get(actorId);
    return emp && emp.email ? emp.email : '';
  }

  getActionBadgeClass(action: string): string {
    const a = (action || '').toUpperCase().trim();
    const greenActions = new Set(['CREATE', 'ADD', 'REGISTER']);
    const blueActions = new Set(['UPDATE', 'EDIT', 'SUBMIT', 'REFRESH_TOKEN']);
    const redActions = new Set(['DELETE', 'REMOVE']);

    if (greenActions.has(a)) return 'badge-create';
    if (blueActions.has(a)) return 'badge-update';
    if (redActions.has(a)) return 'badge-delete';
    return 'badge-default';
  }

  applyFilter(): void {
    let actorIdFilter: number | undefined = undefined;

    // Frontend filtering to map searchTerm to actorId
    if (this.searchQuery) {
      // If employee mapping is not ready yet, don't restrict by actorId.
      // This prevents showing "no records" just because actorId mapping hasn't loaded.
      if (!this.employees.length) {
        actorIdFilter = undefined;
      } else {
      const q = this.searchQuery.toLowerCase();
      const matched = this.employees.find(emp => 
        (emp.fullName && emp.fullName.toLowerCase().includes(q)) || 
        (emp.email && emp.email.toLowerCase().includes(q))
      );
      if (matched) {
        actorIdFilter = matched.employeeId;
      } else {
        // Force a non-existent ID so it returns empty if no match found
        actorIdFilter = -1;
      }
      }
    }

    this.currentPage = 1;
    this.filter = {
      ...this.filter,
      page: this.currentPage,
      entityType: this.selectedModule || undefined,
      action: this.selectedAction || undefined,
      actorId: actorIdFilter,
    };

    this.fetchData();
  }

  resetFilter(): void {
    this.searchQuery = '';
    this.selectedModule = '';
    this.selectedAction = '';
    this.currentPage = 1;
    this.filter = {
      ...this.filter,
      page: this.currentPage,
      entityType: undefined,
      action: undefined,
      actorId: undefined,
    };
    this.fetchData();
  }

  changePage(page: number): void {
    if (page < 1 || (this.totalPages && page > this.totalPages)) return;
    this.currentPage = page;
    this.filter = { ...this.filter, page: this.currentPage };
    this.fetchData();
  }

  changePageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.pageSize = Number(target.value);
    this.currentPage = 1;
    this.filter = { ...this.filter, page: this.currentPage, size: this.pageSize };
    this.fetchData();
  }

  openDetailsModal(log: AuditLog): void {
    this.selectedLog = log;
    try {
      this.formattedOldValue = log.oldValueJson ? JSON.stringify(JSON.parse(log.oldValueJson), null, 2) : 'No previous data';
    } catch {
      this.formattedOldValue = log.oldValueJson || 'No previous data';
    }
    
    try {
      this.formattedNewValue = log.newValueJson ? JSON.stringify(JSON.parse(log.newValueJson), null, 2) : 'No new data';
    } catch {
      this.formattedNewValue = log.newValueJson || 'No new data';
    }
    
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedLog = null;
  }
}
