import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { catchError, map, switchMap, takeUntil, tap } from 'rxjs/operators';
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
  logs$: Observable<AuditLog[]> | undefined;
  employees: EmployeeDto[] = [];
  employeesMap = new Map<number, EmployeeDto>();

  isLoading = false;
  totalElements = 0;
  totalPages = 0;
  currentPage = 1;
  pageSize = 10;
  
  filter$ = new BehaviorSubject<AuditLogFilter>({
    page: 1,
    size: 10,
    sortBy: 'createdAt',
    sortDir: 'desc'
  });

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
  actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];

  Math = Math;

  constructor(
    private auditLogService: AuditLogService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
    // Fetch employees first for mapping
    this.employeeService.getAll().pipe(
      takeUntil(this.destroy$),
      catchError(() => of([]))
    ).subscribe((emps) => {
      this.employees = emps;
      emps.forEach(emp => this.employeesMap.set(emp.employeeId, emp));
      this.initDataStream();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initDataStream(): void {
    this.logs$ = this.filter$.pipe(
      tap(() => this.isLoading = true),
      switchMap(filter => this.auditLogService.getAuditLogs(filter).pipe(
        catchError(() => {
           this.isLoading = false;
           return of({ items: [], content: [], data: [], totalElements: 0, totalPages: 0, page: 1, size: 10 } as PageResponse<AuditLog>);
        })
      )),
      map(response => {
        this.isLoading = false;
        // Map total elements safely based on what BE returns
        this.totalElements = response.totalElements || response.totalItems || 0;
        this.totalPages = response.totalPages || 0;
        return response.items || response.content || response.data || [];
      })
    );
  }

  getEmployeeName(actorId: number): string {
    const emp = this.employeesMap.get(actorId);
    return emp ? (emp.fullName || `Actor ${actorId}`) : `System/Unknown (${actorId})`;
  }

  getEmployeeIdentity(actorId: number): string {
    const emp = this.employeesMap.get(actorId);
    return emp && emp.email ? emp.email : '';
  }

  applyFilter(): void {
    let actorIdFilter: number | undefined = undefined;

    // Frontend filtering to map searchTerm to actorId
    if (this.searchQuery) {
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

    this.filter$.next({
      ...this.filter$.value,
      page: 1, // reset to page 1 on filter
      entityType: this.selectedModule || undefined,
      action: this.selectedAction || undefined,
      actorId: actorIdFilter
    });
  }

  resetFilter(): void {
    this.searchQuery = '';
    this.selectedModule = '';
    this.selectedAction = '';
    this.applyFilter();
  }

  changePage(page: number): void {
    if (page < 1 || (this.totalPages && page > this.totalPages)) return;
    this.currentPage = page;
    this.filter$.next({
      ...this.filter$.value,
      page: this.currentPage
    });
  }

  changePageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.pageSize = Number(target.value);
    this.currentPage = 1;
    this.filter$.next({
      ...this.filter$.value,
      page: this.currentPage,
      size: this.pageSize
    });
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
