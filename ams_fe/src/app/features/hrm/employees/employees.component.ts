import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { EmployeeService, EmployeeDto } from './employee.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface UiEmployee {
  id: string;
  employeeCode?: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  departmentId?: number | null;
  positionId?: number | null;
  managerId?: number | null;
  dob?: string | null;
  gender?: string | null;
  hireDate?: string | null;
  employeeId: string;
  status: 'active' | 'inactive' | 'on-leave';
  startDate: string;
  avatar: string;
  salary: string;
  location: string;
}

interface LookupOption {
  id: number;
  name: string;
}

@Component({
  standalone: false,
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss'],
})
export class EmployeesComponent implements OnInit, OnDestroy {
  searchQuery = '';
  selectedDepartment: string | number = '';
  selectedStatus = '';
  showAddModal = false;
  showEditModal = false;
  showDeleteModal = false;
  selectedEmployee: UiEmployee | null = null;
  viewMode: 'grid' | 'table' = 'table';

  apiLoaded = false;
  apiError = false;

  employees: UiEmployee[] = [];
  departments: LookupOption[] = [];

  // Paging state
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  isLoading = false;

  // Search debounce
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  addForm!: ReturnType<FormBuilder['group']>;
  editForm!: ReturnType<FormBuilder['group']>;

  constructor(private fb: FormBuilder, private employeeService: EmployeeService, private cdr: ChangeDetectorRef) {
    this.addForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.email]],
      phone: ['', [this.phoneValidator]],
      dob: ['', [this.pastDateValidator]],
      gender: [''],
      departmentId: [null],
      hireDate: [''],
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.email]],
      phone: [''],
      departmentId: [null],
    });

  }

  ngOnInit(): void {
    this.loadEmployeesPage();
    this.loadLookups();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  private setupSearchDebounce(): void {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(query => {
      this.currentPage = 1;
      if (query.trim()) {
        this.searchEmployeesServer(query);
      } else {
        this.loadEmployeesPage();
      }
    });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }


  get filteredEmployees(): UiEmployee[] {
    // Client-side filtering is no longer primary, but we might still need to filter by status/dept if BE doesn't support it yet.
    // However, the requirement says "USE SERVER-SIDE PAGING & SEARCH". 
    // If the BE doesn't support status filter in /page, we might have to accept that filtering happens on the current page or 
    // we would need to implement it in BE. 
    // Given "No Backend Changes", we strictly display what BE returns for the current page.
    // If the user wants to filter by Dept/Status *locally* on the *fetched page*, we can do that, but it breaks pagination.
    // Implementation: Return all employees from current page. 
    // Refinement: If selectedDepartment or selectedStatus is set, we attempt to filter the *current page* results.

    return this.employees.filter(emp => {
      const matchesDepartment = !this.selectedDepartment || emp.departmentId === Number(this.selectedDepartment);
      const matchesStatus = !this.selectedStatus || this.normalizeStatusForFilter(emp.status) === this.selectedStatus;
      return matchesDepartment && matchesStatus;
    });
  }

  private normalizeStatusForFilter(status: string): string {
    if (!status) return '';
    const upper = status.toUpperCase().replace(/-/g, '_').replace(/ /g, '_');
    if (upper === 'ON_LEAVE' || upper === 'ONLEAVE') return 'ON_LEAVE';
    return upper;
  }

  onFilterChange(): void {
    // Ideally this should trigger a backend reload with filter params, but without BE support for filters in /page,
    // we just rely on client-side filtering of the *current page* via the getter. 
    // Or we reset to page 1 if we want to be safe, but since it's client-side only on the page, it doesn't matter much.
    this.cdr.markForCheck();
  }

  get totalEmployees(): number {
    return this.totalItems;
  }

  get activeCount(): number {
    return this.employees.filter(e => this.normalizeStatusForFilter(e.status) === 'ACTIVE').length;
  }

  get onLeaveCount(): number {
    return this.employees.filter(e => this.normalizeStatusForFilter(e.status) === 'ON_LEAVE').length;
  }

  get inactiveCount(): number {
    return this.employees.filter(e => this.normalizeStatusForFilter(e.status) === 'INACTIVE').length;
  }

  openAddModal(): void {
    this.addForm.reset({
      departmentId: null,
      gender: '',
    });
    this.showAddModal = true;
  }

  handleAddEmployee(): void {
    if (this.addForm.invalid) {
      return;
    }

    const value = this.addForm.value;
    const fullName = `${value.firstName ?? ''} ${value.lastName ?? ''}`.trim();
    this.employeeService
      .create({
        employeeCode: this.generateEmployeeCode(),
        fullName: fullName || 'New Employee',
        dob: this.optionalDate(value.dob),
        gender: this.optionalString(value.gender),
        phone: this.optionalString(value.phone),
        email: this.optionalString(value.email),
        departmentId: value.departmentId ?? undefined,
        hireDate: this.optionalDate(value.hireDate),
      })
      .subscribe({
        next: () => {
          this.showAddModal = false;
          this.loadEmployees();
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

    // Load fresh data from BE to get all hidden fields
    this.employeeService.getById(employeeId).subscribe({
      next: (freshData) => {
        const freshUi = this.mapDtoToUi(freshData);
        this.selectedEmployee = freshUi;
        this.editForm.reset({
          name: freshUi.name,
          email: freshUi.email,
          phone: freshUi.phone,
          departmentId: freshUi.departmentId,
        });
        this.showEditModal = true;
        this.cdr.markForCheck();
      },
      error: () => {
        // Fallback to existing data if getById fails
        this.selectedEmployee = employee;
        this.editForm.reset({
          name: employee.name,
          email: employee.email,
          phone: employee.phone,
          departmentId: employee.departmentId,
        });
        this.showEditModal = true;
      },
    });
  }

  handleEditEmployee(): void {
    if (!this.selectedEmployee || this.editForm.invalid) {
      return;
    }

    const employeeId = Number(this.selectedEmployee.id);
    if (!Number.isFinite(employeeId)) {
      alert('Invalid employee ID.');
      return;
    }

    const value = this.editForm.value;
    const payload = {
      employeeCode: this.optionalString(this.selectedEmployee.employeeCode),
      fullName: this.optionalString(value.name) ?? this.selectedEmployee.name,
      email: this.optionalString(value.email) ?? this.selectedEmployee.email,
      phone: this.normalizePhone(this.optionalString(value.phone) ?? this.selectedEmployee.phone),
      departmentId: value.departmentId ?? this.selectedEmployee.departmentId ?? undefined,
      positionId: this.selectedEmployee.positionId ?? undefined,
      managerId: this.selectedEmployee.managerId ?? undefined,
      dob: this.optionalDate(this.selectedEmployee.dob),
      gender: this.optionalString(this.selectedEmployee.gender),
      hireDate: this.optionalDate(this.selectedEmployee.hireDate),
    };
    this.employeeService
      .update(employeeId, payload)
      .subscribe({
        next: () => {
          this.showEditModal = false;
          this.selectedEmployee = null;
          this.loadEmployees();
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
        this.showDeleteModal = false;
        this.selectedEmployee = null;
        this.loadEmployees();
      },
      error: () => {
        alert('Unable to delete employee. Please try again.');
      },
    });
  }

  handleExport(): void {
    // Export API not available yet; keep current UI behavior.
    alert('Exporting employee data to CSV...');
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      case 'on-leave':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'on-leave':
        return 'On Leave';
      default:
        return status;
    }
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

  private listInvalidControls(form: ReturnType<FormBuilder['group']>): string[] {
    return Object.keys(form.controls).filter(key => form.controls[key].invalid);
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
      name: fullName,
      email: employee.email ?? '',
      phone: employee.phone ?? '',
      department: employee.departmentId ? `Dept #${employee.departmentId}` : 'Unassigned',
      position: employee.positionId ? `Position #${employee.positionId}` : 'Unassigned',
      departmentId: employee.departmentId ?? null,
      positionId: employee.positionId ?? null,
      managerId: employee.managerId ?? null,
      dob: employee.dob ?? null,
      gender: employee.gender ?? null,
      hireDate: employee.hireDate ?? null,
      employeeId: employee.employeeCode || `EMP-${employee.employeeId}`,
      status: (employee.status as UiEmployee['status']) || 'active',
      startDate: employee.hireDate ?? '',
      avatar: this.initials(fullName),
      salary: 'N/A',
      location: 'N/A',
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

  private loadEmployees(): void {
    this.loadEmployeesPage();
  }

  private loadEmployeesPage(): void {
    this.isLoading = true;
    this.employeeService.getPage(this.currentPage, this.pageSize).subscribe({
      next: response => {
        this.apiLoaded = true;
        this.apiError = false;
        const items = response.items || response.content || [];
        this.employees = items.map(employee => this.mapDtoToUi(employee));
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || Math.ceil(this.totalItems / this.pageSize);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.apiLoaded = true;
        this.apiError = true;
        this.employees = [];
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private searchEmployeesServer(query: string): void {
    this.isLoading = true;
    this.employeeService.searchByName(query, this.currentPage, this.pageSize).subscribe({
      next: response => {
        this.apiLoaded = true;
        this.apiError = false;
        const items = response.items || response.content || [];
        this.employees = items.map(employee => this.mapDtoToUi(employee));
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || Math.ceil(this.totalItems / this.pageSize);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.apiLoaded = true;
        this.apiError = true;
        this.employees = [];
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    if (this.searchQuery.trim()) {
      this.searchEmployeesServer(this.searchQuery);
    } else {
      this.loadEmployeesPage();
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  private loadLookups(): void {
    this.employeeService.getDepartments().subscribe({
      next: departments => {
        this.departments = departments.map(dept => ({ id: dept.departmentId, name: dept.departmentName }));
        this.cdr.markForCheck();
      },
      error: () => {
        this.departments = [];
        this.cdr.markForCheck();
      },
    });
  }

  private generateEmployeeCode(): string {
    const now = Date.now();
    const rand = Math.floor(Math.random() * 900 + 100);
    return `EMP-${now}-${rand}`;
  }
}

