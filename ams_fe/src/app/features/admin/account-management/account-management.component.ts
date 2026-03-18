import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  AdminService,
  AccountRoleDefinition,
  PermissionDefinition,
  UserAccountRecord,
} from '../admin.service';
import {
  CreateAccountRequest,
  UpdateAccountRequest,
  AccountRole,
} from '../../../shared/models/account.model';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EmployeeDto, EmployeeService } from '../../hrm/employees/employee.service';

type AccountTab = 'users' | 'roles' | 'permissions';
type RoleType = 'admin' | 'manager' | 'hr' | 'employee';
type StatusType = 'active' | 'inactive';

@Component({
  standalone: false,
  selector: 'app-account-management',
  templateUrl: './account-management.component.html',
  styleUrls: ['./account-management.component.scss'],
})
export class AccountManagementComponent implements OnInit, OnDestroy {
  activeTab: AccountTab = 'users';
  showAddUser = false;
  showEditUser = false;
  showDeleteModal = false;
  selectedUser: UserAccountRecord | null = null;

  // Search state
  searchQuery = '';
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  // Filter state
  filterRole = 'all';
  filterStatus = 'all';

  // Pagination state
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  isLoading = false;
  apiError = false;

  userAccounts: UserAccountRecord[] = [];
  roles: AccountRoleDefinition[] = [];
  permissions: PermissionDefinition[] = [];
  availableEmployees: EmployeeDto[] = [];

  addUserForm: FormGroup;
  editUserForm: FormGroup;

  readonly roleColors: Record<RoleType, string> = {
    admin: 'bg-red-100 text-red-700',
    manager: 'bg-blue-100 text-blue-700',
    hr: 'bg-green-100 text-green-700',
    employee: 'bg-gray-100 text-gray-700',
  };

  readonly statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    suspended: 'bg-red-100 text-red-700',
  };

  readonly roleCardStyles: Record<string, { bg: string; text: string }> = {
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-600' },
  };

  constructor(
    private adminService: AdminService,
    private employeeService: EmployeeService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.addUserForm = this.fb.group({
      employeeId: [null, Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['admin', Validators.required],
      department: ['Operations', Validators.required],
      tempPassword: [''],
      status: ['Active', Validators.required],
      sendWelcome: [true],
    });

    this.editUserForm = this.fb.group({
      name: ['', Validators.required],
      email: [''],  // BE doesn't return or accept email in UpdateAccountRequest
      role: ['admin', Validators.required],
      department: [''],  // BE doesn't return or accept department in UpdateAccountRequest
      status: ['active', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.loadAvailableEmployeesForCreate();

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadData();
    });

    this.adminService.getAccountRoles().subscribe((roles) => {
      this.roles = roles;
    });

    this.adminService.getPermissions().subscribe((permissions) => {
      this.permissions = permissions;
    });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  loadData(): void {
    this.isLoading = true;
    this.apiError = false;
    const apiPage = this.currentPage - 1; // API is 0-based

    let isActive: boolean | undefined = undefined;
    if (this.filterStatus === 'active') isActive = true;
    else if (this.filterStatus === 'inactive') isActive = false;

    let request$;
    if (this.searchQuery.trim()) {
      request$ = this.adminService.searchAccounts(
        this.searchQuery,
        apiPage,
        this.pageSize,
        'accountId',
        'desc'
      );
    } else {
      request$ = this.adminService.getAccountsPage(
        apiPage,
        this.pageSize,
        'accountId',
        'desc',
        isActive
      );
    }

    request$.subscribe({
      next: (response) => {
        const items = response.items || [];
        this.userAccounts = items.map(a => this.mapAccountDtoToRecord(a));
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || Math.ceil(this.totalItems / this.pageSize);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load accounts', err);
        this.userAccounts = [];
        this.totalItems = 0;
        this.isLoading = false;
        this.apiError = true;
        this.cdr.markForCheck();
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.loadData();
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  private mapAccountDtoToRecord(a: any): UserAccountRecord {
    return {
      id: String(a.accountId),
      name: a.username,
      email: '', // Not returned by API
      role: a.role as AccountRole,
      department: '',
      status: a.isActive ? 'active' : 'inactive',
      lastLogin: a.lastLoginAt ?? 'Never',
      createdDate: a.createdAt ? a.createdAt.split('T')[0] : '',
      permissions: [],
    };
  }

  get filteredUsers(): UserAccountRecord[] {
    return this.userAccounts.filter((user) => {
      const matchesRole = this.filterRole === 'all' || user.role === this.filterRole;
      return matchesRole;
    });
  }

  onRoleFilterChange(): void {
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.loadData();
  }

  get activeUserCount(): number {
    return this.userAccounts.filter((user) => user.status === 'active').length;
  }

  get inactiveUserCount(): number {
    return this.userAccounts.filter((user) => user.status === 'inactive').length;
  }

  get adminUserCount(): number {
    return this.userAccounts.filter((user) => user.role === 'admin').length;
  }

  getUserInitials(name: string): string {
    return name
      .split(' ')
      .filter((part) => part.length > 0)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  openAddUserModal(): void {
    this.addUserForm.reset({
      employeeId: null,
      name: '',
      email: '',
      role: 'employee',
      department: 'Operations',
      tempPassword: '',
      status: 'Active',
      sendWelcome: true,
    });
    this.loadAvailableEmployeesForCreate();
    this.showAddUser = true;
    this.cdr.detectChanges();
  }

  closeAddUserModal(): void {
    this.showAddUser = false;
    this.addUserForm.reset();
    this.cdr.detectChanges();
  }

  openEditUserModal(user: UserAccountRecord): void {
    this.selectedUser = user;
    this.editUserForm.reset({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
    });
    this.showEditUser = true;
    this.cdr.detectChanges();
  }

  closeEditUserModal(): void {
    this.showEditUser = false;
    this.selectedUser = null;
    this.cdr.detectChanges();
  }

  openDeleteUserModal(user: UserAccountRecord): void {
    this.selectedUser = user;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteUserModal(): void {
    this.showDeleteModal = false;
    this.selectedUser = null;
    this.cdr.detectChanges();
  }

  confirmDeleteUser(): void {
    if (!this.selectedUser) return;

    // Parse to number for API
    const userIdNum = Number(this.selectedUser.id);
    if (isNaN(userIdNum)) {
      console.error('UserId is not a number:', this.selectedUser.id);
      return;
    }

    this.adminService.deleteAccount(userIdNum).subscribe({
      next: () => {
        this.closeDeleteUserModal();
        if (this.userAccounts.length === 1 && this.currentPage > 1) {
          this.currentPage--;
        }
        this.loadData();
      },
      error: (err) => {
        console.error('Delete failed', err);
        alert('Failed to delete user');
      }
    });
  }

  createUser(): void {
    if (this.addUserForm.invalid) {
      return;
    }

    const value = this.addUserForm.value;
    const employeeId = Number(value.employeeId);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return;
    }

    const request: CreateAccountRequest = {
      employeeId,
      username: value.name,
      password: value.tempPassword || 'TempPass123!',
      role: value.role as AccountRole,
      isActive: value.status.toLowerCase() !== 'inactive',
    };

    this.adminService.createAccount(request).subscribe({
      next: () => {
        this.closeAddUserModal();
        this.loadData();
      },
      error: (err) => {
        console.error('Failed to create account', err);
      },
    });
  }

  saveUserEdits(): void {
    if (this.editUserForm.invalid || !this.selectedUser) {
      return;
    }

    const value = this.editUserForm.value;
    const accountId = Number(this.selectedUser.id);

    const request: UpdateAccountRequest = {
      username: value.name,
      role: value.role as AccountRole,
      isActive: value.status !== 'inactive',
    };

    this.adminService.updateAccount(accountId, request).subscribe({
      next: () => {
        this.closeEditUserModal();
        this.loadData();
      },
      error: (err) => {
        console.error('Failed to update account', err);
        this.closeEditUserModal();
      },
    });
  }

  getRoleCardBg(roleColor: string): string {
    return this.roleCardStyles[roleColor]?.bg ?? 'bg-gray-100';
  }

  getRoleCardText(roleColor: string): string {
    return this.roleCardStyles[roleColor]?.text ?? 'text-gray-600';
  }

  private loadAvailableEmployeesForCreate(): void {
    forkJoin({
      employees: this.employeeService.getAll(),
      accounts: this.adminService.getAccounts(),
    }).subscribe({
      next: ({ employees, accounts }) => {
        const assignedEmployeeIds = new Set(
          accounts
            .map((account) => account.employeeId)
            .filter((employeeId): employeeId is number => Number.isInteger(employeeId) && employeeId > 0)
        );

        this.availableEmployees = employees.filter((employee) => !assignedEmployeeIds.has(employee.employeeId));
        this.syncDefaultEmployeeForCreateForm();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load available employees for account creation', err);
        this.availableEmployees = [];
        this.cdr.markForCheck();
      },
    });
  }

  private syncDefaultEmployeeForCreateForm(): void {
    if (!this.showAddUser || this.addUserForm.get('role')?.value !== 'employee') {
      return;
    }

    const employeeControl = this.addUserForm.get('employeeId');
    const firstAvailableEmployeeId = this.availableEmployees[0]?.employeeId ?? null;
    const selectedEmployeeId = Number(employeeControl?.value);
    const hasMatchingOption = this.availableEmployees.some((employee) => employee.employeeId === selectedEmployeeId);

    if (employeeControl && firstAvailableEmployeeId !== null && !hasMatchingOption) {
      employeeControl.patchValue(firstAvailableEmployeeId);
      employeeControl.updateValueAndValidity();
      this.addUserForm.updateValueAndValidity();
    }
  }
}
