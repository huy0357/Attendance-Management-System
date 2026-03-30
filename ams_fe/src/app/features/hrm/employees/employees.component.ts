import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DepartmentDto, EmployeeDto, EmployeeService, PositionDto } from './employee.service';
import { RoleResponse } from '../../../shared/models/account.model';
import { AuthService } from '../../../core/auth/auth.service';

interface UiEmployee {
  id: string;
  employeeCode?: string | null;
  fullName: string;
  email: string;
  phone: string;
  departmentId?: number | null;
  positionId?: number | null;
  managerId?: number | null;
  dob?: string | null;
  gender?: string | null;
  hireDate?: string | null;
  terminatedDate?: string | null;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  employeeLabel: string;
  avatar: string;
}

@Component({
  standalone: false,
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss'],
})
export class EmployeesComponent implements OnInit, OnDestroy {
  @ViewChild('pageHeading') private pageHeading?: ElementRef<HTMLElement>;

  searchQuery = '';
  showAddModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showRoleModal = false;
  selectedEmployee: UiEmployee | null = null;
  viewMode: 'grid' | 'table' = 'table';

  apiLoaded = false;
  apiError = false;
  isExporting = false;

  employees: UiEmployee[] = [];
  departments: DepartmentDto[] = [];
  positions: PositionDto[] = [];
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  isLoading = false;
  sortBy = 'employee_id';
  sortDir: 'asc' | 'desc' = 'asc';
  isRoleLoading = false;
  isRoleSaving = false;
  roleModalError = '';
  roleModalMessage = '';
  availableRoles: RoleResponse[] = [];
  currentEmployeeRoles: RoleResponse[] = [];
  selectedRoleId: number | null = null;
  readonly pageSizeOptions = [10, 20, 50];
  readonly sortOptions = [
    { value: 'employee_id', label: 'Employee ID' },
    { value: 'employee_code', label: 'Employee Code' },
    { value: 'full_name', label: 'Full Name' },
    { value: 'hire_date', label: 'Hire Date' },
  ];

  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  addForm!: ReturnType<FormBuilder['group']>;
  editForm!: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.addForm = this.fb.group({
      employeeCode: ['', [Validators.required]],
      fullName: ['', [Validators.required]],
      email: ['', [Validators.email]],
      phone: ['', [this.phoneValidator]],
      dob: ['', [this.pastDateValidator]],
      gender: [''],
      departmentId: [null, [Validators.required]],
      positionId: [null],
      managerId: [null],
      hireDate: [''],
    });

    this.editForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.email]],
      phone: ['', [this.phoneValidator]],
      dob: ['', [this.pastDateValidator]],
      gender: [''],
      departmentId: [null],
      positionId: [null],
      managerId: [null],
      hireDate: [''],
    });
  }

  ngOnInit(): void {
    this.employeeService.getDepartments().subscribe(res => { this.departments = res; this.cdr.markForCheck(); });
    this.employeeService.getPositions().subscribe(res => { this.positions = res; this.cdr.markForCheck(); });
    this.loadEmployeesPage();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  get filteredEmployees(): UiEmployee[] {
    return this.employees;
  }

  get totalEmployees(): number {
    return this.totalItems;
  }

  get canManageEmployees(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'HR', 'MANAGER']);
  }

  get canExportEmployees(): boolean {
    return this.canManageEmployees;
  }

  get canManageEmployeeRoles(): boolean {
    return this.authService.hasRole('ADMIN');
  }

  get canOpenOtherEmployeeAttendance(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'HR', 'MANAGER']);
  }

  getDepartmentName(id: number | null | undefined): string {
    if (!id) return '-';
    const dept = this.departments.find(d => d.departmentId === id);
    return dept ? dept.departmentName : id.toString();
  }

  getPositionName(id: number | null | undefined): string {
    if (!id) return '-';
    const pos = this.positions.find(p => p.positionId === id);
    return pos ? pos.positionName : id.toString();
  }

  get canAddEmployee(): boolean {
    return this.authService.hasRole('ADMIN');
  }

  openAddModal(): void {
    this.addForm.reset({
      employeeCode: '',
      fullName: '',
      email: '',
      phone: '',
      dob: '',
      gender: '',
      departmentId: null,
      positionId: null,
      managerId: null,
      hireDate: '',
    });
    this.showAddModal = true;
  }

  exportEmployees(): void {
    this.isExporting = true;
    this.employeeService.exportEmployees().subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          this.isExporting = false;
          alert('Unable to export employees. Empty response.');
          return;
        }

        const contentDisposition = response.headers.get('content-disposition') ?? '';
        const fileNameMatch = /filename=([^;]+)/i.exec(contentDisposition);
        const fileName = fileNameMatch?.[1]?.replace(/"/g, '')?.trim() || 'employees.xlsx';
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
        this.isExporting = false;
      },
      error: () => {
        this.isExporting = false;
        alert('Unable to export employees. Please try again.');
      },
    });
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  handleAddEmployee(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    const value = this.addForm.getRawValue();
    this.employeeService.create(this.buildRequestPayload(value)).subscribe({
      next: () => {
        this.closeAddModal();
        this.reloadCurrentData();
      },
      error: () => {
        alert('Unable to add employee. Please try again.');
      },
    });
  }

  openEditModal(employee: UiEmployee): void {
    const employeeId = Number(employee.id);
    if (!Number.isFinite(employeeId)) {
      alert('Invalid employee ID.');
      return;
    }

    this.employeeService.getById(employeeId).subscribe({
      next: (freshData) => {
        this.selectedEmployee = this.mapDtoToUi(freshData);
        this.patchEditForm(this.selectedEmployee);
        this.showEditModal = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.selectedEmployee = employee;
        this.patchEditForm(employee);
        this.showEditModal = true;
        this.cdr.markForCheck();
      },
    });
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedEmployee = null;
  }

  handleEditEmployee(): void {
    if (!this.selectedEmployee || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const employeeId = Number(this.selectedEmployee.id);
    if (!Number.isFinite(employeeId)) {
      alert('Invalid employee ID.');
      return;
    }

    const value = this.editForm.getRawValue();
    this.employeeService.update(employeeId, {
      employeeCode: this.optionalString(this.selectedEmployee.employeeCode),
      fullName: this.optionalString(value.fullName) ?? this.selectedEmployee.fullName,
      dob: this.optionalDate(value.dob) ?? this.optionalDate(this.selectedEmployee.dob),
      gender: this.optionalString(value.gender) ?? this.optionalString(this.selectedEmployee.gender),
      phone: this.normalizePhone(this.optionalString(value.phone) ?? this.selectedEmployee.phone),
      email: this.optionalString(value.email) ?? this.selectedEmployee.email,
      departmentId: this.optionalNumber(value.departmentId) ?? this.selectedEmployee.departmentId ?? undefined,
      positionId: this.optionalNumber(value.positionId) ?? this.selectedEmployee.positionId ?? undefined,
      managerId: this.optionalNumber(value.managerId) ?? this.selectedEmployee.managerId ?? undefined,
      hireDate: this.optionalDate(value.hireDate) ?? this.optionalDate(this.selectedEmployee.hireDate),
    }).subscribe({
      next: () => {
        this.closeEditModal();
        this.reloadCurrentData();
      },
      error: () => {
        alert('Unable to update employee. Please try again.');
      },
    });
  }

  openDeleteModal(employee: UiEmployee): void {
    this.selectedEmployee = employee;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedEmployee = null;
  }

  openRoleModal(employee: UiEmployee): void {
    this.selectedEmployee = employee;
    this.showRoleModal = true;
    this.roleModalError = '';
    this.roleModalMessage = '';
    this.availableRoles = [];
    this.currentEmployeeRoles = [];
    this.selectedRoleId = null;
    this.loadRoleData(employee);
  }

  closeRoleModal(): void {
    this.showRoleModal = false;
    this.selectedEmployee = null;
    this.availableRoles = [];
    this.currentEmployeeRoles = [];
    this.selectedRoleId = null;
    this.roleModalError = '';
    this.roleModalMessage = '';
  }

  assignSelectedRole(): void {
    if (!this.selectedEmployee || !this.selectedRoleId || this.isRoleSaving) {
      return;
    }

    const employeeId = Number(this.selectedEmployee.id);
    if (!Number.isFinite(employeeId)) {
      this.roleModalError = 'Invalid employee ID.';
      return;
    }

    this.isRoleSaving = true;
    this.roleModalError = '';
    this.roleModalMessage = '';
    this.employeeService.assignRoleToEmployee(employeeId, this.selectedRoleId).subscribe({
      next: (response) => {
        this.isRoleSaving = false;
        this.roleModalMessage = response.message || 'Role assigned successfully.';
        this.loadRoleData(this.selectedEmployee as UiEmployee);
      },
      error: (error) => {
        this.isRoleSaving = false;
        this.roleModalError = this.resolveApiError(error, 'Unable to assign role.');
      },
    });
  }

  removeRole(role: RoleResponse): void {
    if (!this.selectedEmployee || this.isRoleSaving) {
      return;
    }

    const employeeId = Number(this.selectedEmployee.id);
    if (!Number.isFinite(employeeId)) {
      this.roleModalError = 'Invalid employee ID.';
      return;
    }

    this.isRoleSaving = true;
    this.roleModalError = '';
    this.roleModalMessage = '';
    this.employeeService.removeRoleFromEmployee(employeeId, role.roleId).subscribe({
      next: (response) => {
        this.isRoleSaving = false;
        this.roleModalMessage = response.message || 'Role removed successfully.';
        this.loadRoleData(this.selectedEmployee as UiEmployee);
      },
      error: (error) => {
        this.isRoleSaving = false;
        this.roleModalError = this.resolveApiError(error, 'Unable to remove role.');
      },
    });
  }

  navigateToAttendance(employee: UiEmployee): void {
    const employeeId = Number(employee.id);
    if (!Number.isFinite(employeeId)) {
      alert('Invalid employee ID.');
      return;
    }

    this.router.navigate(['/attendance/attendance-daily/employee', employeeId]);
  }

  handleDeleteEmployee(): void {
    if (!this.selectedEmployee) {
      return;
    }

    const employeeId = Number(this.selectedEmployee.id);
    if (!Number.isFinite(employeeId)) {
      alert('Invalid employee ID.');
      return;
    }

    this.employeeService.delete(employeeId).subscribe({
      next: () => {
        this.closeDeleteModal();
        if (this.currentPage > 1 && this.employees.length === 1) {
          this.currentPage -= 1;
        }
        this.reloadCurrentData();
      },
      error: () => {
        alert('Unable to delete employee. Please try again.');
      },
    });
  }

  getStatusColor(status: string): string {
    switch (this.normalizeStatus(status)) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-700';
      case 'ON_LEAVE':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  getStatusLabel(status: string): string {
    switch (this.normalizeStatus(status)) {
      case 'ACTIVE':
        return 'Active';
      case 'INACTIVE':
        return 'Inactive';
      case 'ON_LEAVE':
        return 'On Leave';
      default:
        return status || 'Unknown';
    }
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.reloadCurrentData();
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.reloadCurrentData();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.reloadCurrentData();
  }

  formatDate(value?: string | null): string {
    return value || '-';
  }

  formatOptionalNumber(value?: number | null): string {
    return value == null ? '-' : String(value);
  }

  getCurrentRoleLabel(employee: UiEmployee): string {
    if (this.selectedEmployee?.id === employee.id && this.currentEmployeeRoles.length > 0) {
      return this.currentEmployeeRoles[0].roleCode;
    }

    return 'Manage role';
  }

  trackByEmployeeId(_: number, employee: UiEmployee): string {
    return employee.id;
  }

  trackByRoleId(_: number, role: RoleResponse): number {
    return role.roleId;
  }

  private setupSearchDebounce(): void {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
    ).subscribe(query => {
      this.currentPage = 1;
      this.reloadCurrentData(query);
    });
  }

  private reloadCurrentData(query?: string): void {
    const effectiveQuery = query ?? this.searchQuery;
    if (effectiveQuery.trim()) {
      this.searchEmployeesServer(effectiveQuery);
      return;
    }

    this.loadEmployeesPage();
  }

  private loadEmployeesPage(): void {
    this.isLoading = true;
    this.employeeService.getPage(this.currentPage, this.pageSize, this.sortBy, this.sortDir).subscribe({
      next: response => {
        this.applyPageResponse(response.items || response.content || []);
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || Math.ceil(this.totalItems / this.pageSize) || 1;
      },
      error: () => {
        this.handleLoadError();
      },
    });
  }

  private searchEmployeesServer(query: string): void {
    this.isLoading = true;
    this.employeeService.searchByName(query, this.currentPage, this.pageSize, this.sortBy, this.sortDir).subscribe({
      next: response => {
        this.applyPageResponse(response.items || response.content || []);
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || Math.ceil(this.totalItems / this.pageSize) || 1;
      },
      error: () => {
        this.handleLoadError();
      },
    });
  }

  private applyPageResponse(items: EmployeeDto[]): void {
    this.apiLoaded = true;
    this.apiError = false;
    this.employees = items.map(employee => this.mapDtoToUi(employee));
    this.isLoading = false;
    this.scrollHeadingIntoView();
    this.cdr.markForCheck();
  }

  private handleLoadError(): void {
    this.apiLoaded = true;
    this.apiError = true;
    this.employees = [];
    this.totalItems = 0;
    this.totalPages = 0;
    this.isLoading = false;
    this.cdr.markForCheck();
  }

  private patchEditForm(employee: UiEmployee): void {
    this.editForm.reset({
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phone,
      dob: employee.dob ?? '',
      gender: employee.gender ?? '',
      departmentId: employee.departmentId ?? null,
      positionId: employee.positionId ?? null,
      managerId: employee.managerId ?? null,
      hireDate: employee.hireDate ?? '',
    });
  }

  private buildRequestPayload(value: Record<string, unknown>) {
    return {
      employeeCode: this.optionalString(value['employeeCode']),
      fullName: this.optionalString(value['fullName']) ?? '',
      dob: this.optionalDate(value['dob']),
      gender: this.optionalString(value['gender']),
      phone: this.normalizePhone(this.optionalString(value['phone'])),
      email: this.optionalString(value['email']),
      departmentId: this.optionalNumber(value['departmentId']),
      positionId: this.optionalNumber(value['positionId']),
      managerId: this.optionalNumber(value['managerId']),
      hireDate: this.optionalDate(value['hireDate']),
    };
  }

  private normalizeStatus(input: string): string {
    return (input ?? '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
  }

  private pastDateValidator(control: AbstractControl): ValidationErrors | null {
    const raw = control.value;
    if (!raw) return null;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today ? null : { pastDate: true };
  }

  private phoneValidator(control: AbstractControl): ValidationErrors | null {
    const raw = control.value;
    if (!raw) return null;
    const digits = String(raw).replace(/\D+/g, '');
    return /^0\d{9}$/.test(digits) ? null : { phone: true };
  }

  private optionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private optionalDate(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private optionalNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private normalizePhone(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const digits = value.replace(/\D+/g, '');
    if (digits.length === 10 && digits.startsWith('0')) {
      return digits;
    }
    return value;
  }

  private mapDtoToUi(employee: EmployeeDto): UiEmployee {
    const fullName = employee.fullName || 'Employee';
    return {
      id: String(employee.employeeId),
      employeeCode: employee.employeeCode,
      fullName,
      email: employee.email ?? '',
      phone: employee.phone ?? '',
      departmentId: employee.departmentId ?? null,
      positionId: employee.positionId ?? null,
      managerId: employee.managerId ?? null,
      dob: employee.dob ?? null,
      gender: employee.gender ?? null,
      hireDate: employee.hireDate ?? null,
      terminatedDate: employee.terminatedDate ?? null,
      status: employee.status ?? '',
      createdAt: employee.createdAt ?? null,
      updatedAt: employee.updatedAt ?? null,
      employeeLabel: employee.employeeCode || `EMP-${employee.employeeId}`,
      avatar: this.initials(fullName),
    };
  }

  private initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  }

  private scrollHeadingIntoView(): void {
    setTimeout(() => {
      this.pageHeading?.nativeElement.scrollIntoView({
        block: 'start',
        inline: 'nearest',
      });
    });
  }

  private loadRoleData(employee: UiEmployee): void {
    const employeeId = Number(employee.id);
    if (!Number.isFinite(employeeId)) {
      this.roleModalError = 'Invalid employee ID.';
      return;
    }

    this.isRoleLoading = true;
    this.employeeService.getAllRoles().subscribe({
      next: (roles) => {
        this.availableRoles = roles;
        this.employeeService.getEmployeeRoles(employeeId).subscribe({
          next: (currentRoles) => {
            this.isRoleLoading = false;
            this.currentEmployeeRoles = currentRoles;
            this.selectedRoleId = currentRoles[0]?.roleId ?? roles[0]?.roleId ?? null;
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.isRoleLoading = false;
            this.currentEmployeeRoles = [];
            this.selectedRoleId = roles[0]?.roleId ?? null;
            this.roleModalError = this.resolveApiError(error, 'Unable to load current role.');
            this.cdr.markForCheck();
          },
        });
      },
      error: (error) => {
        this.isRoleLoading = false;
        this.availableRoles = [];
        this.currentEmployeeRoles = [];
        this.roleModalError = this.resolveApiError(error, 'Unable to load roles.');
        this.cdr.markForCheck();
      },
    });
  }

  private resolveApiError(error: unknown, fallback: string): string {
    return (
      (error as { error?: { message?: string; error?: string } })?.error?.message ||
      (error as { error?: { message?: string; error?: string } })?.error?.error ||
      fallback
    );
  }
}
