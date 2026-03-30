import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import {
  AccountRoleDefinition,
  AdminService,
  UserAccountRecord,
} from '../admin.service';
import {
  AccountDto,
  CreateAccountRequest,
  UpdateAccountRequest,
} from '../../../shared/models/account.model';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EmployeeDto, EmployeeService } from '../../hrm/employees/employee.service';

@Component({
  standalone: false,
  selector: 'app-account-management',
  templateUrl: './account-management.component.html',
  styleUrls: ['./account-management.component.scss'],
})
export class AccountManagementComponent implements OnInit, OnDestroy {
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
  sortBy: 'accountId' | 'username' | 'isActive' | 'createdAt' | 'lastLoginAt' = 'accountId';
  sortDir: 'asc' | 'desc' = 'desc';
  readonly pageSizeOptions = [10, 20, 50];
  readonly sortOptions = [
    { value: 'accountId', label: 'Account ID' },
    { value: 'username', label: 'Username' },
    { value: 'isActive', label: 'Status' },
    { value: 'createdAt', label: 'Created At' },
    { value: 'lastLoginAt', label: 'Last Login' },
  ];

  userAccounts: UserAccountRecord[] = [];
  availableEmployees: EmployeeDto[] = [];
  accountRoles: AccountRoleDefinition[] = [];

  addUserForm: FormGroup;
  editUserForm: FormGroup;

  readonly roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    manager: 'bg-blue-100 text-blue-700',
    hr: 'bg-green-100 text-green-700',
    employee: 'bg-gray-100 text-gray-700',
  };

  readonly statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
  };

  constructor(
    private adminService: AdminService,
    private employeeService: EmployeeService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.addUserForm = this.fb.group({
      employeeId: [null, Validators.required],
      username: ['', [Validators.required, this.trimmedRequiredValidator]],
      roleId: [null, Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      status: ['active', Validators.required],
    });

    this.editUserForm = this.fb.group({
      employeeId: [{ value: null, disabled: true }],
      username: ['', [Validators.required, this.trimmedRequiredValidator]],
      roleId: [null, Validators.required],
      status: ['active', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.loadRoles();
    this.loadAvailableEmployeesForCreate();

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadData();
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

    let isActive: boolean | undefined = undefined;
    if (this.filterStatus === 'active') isActive = true;
    else if (this.filterStatus === 'inactive') isActive = false;

    let request$;
    if (this.searchQuery.trim()) {
      request$ = this.adminService.searchAccounts(
        this.searchQuery,
        this.currentPage,
        this.pageSize,
        this.sortBy,
        this.sortDir
      );
    } else {
      request$ = this.adminService.getAccountsPage(
        this.currentPage,
        this.pageSize,
        this.sortBy,
        this.sortDir,
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
      error: () => {
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

  trackByUserId(_: number, user: UserAccountRecord): string {
    return user.id;
  }

  private mapAccountDtoToRecord(a: AccountDto): UserAccountRecord {
    const roleCode = (a.roleCode ?? '').toUpperCase();
    return {
      id: String(a.accountId),
      employeeId: a.employeeId,
      username: a.username,
      role: roleCode.toLowerCase(),
      status: a.isActive ? 'active' : 'inactive',
      lastLogin: a.lastLoginAt ?? 'Never',
      createdDate: a.createdAt ? a.createdAt.split('T')[0] : '',
      roleId: a.roleId ?? null,
      roleCode: a.roleCode ?? null,
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

  onSortChange(): void {
    this.currentPage = 1;
    this.loadData();
  }

  onPageSizeChange(): void {
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
      username: '',
      roleId: this.getDefaultRoleId(),
      password: '',
      status: 'active',
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
    const accountId = Number(user.id);
    if (!Number.isFinite(accountId)) {
      this.selectedUser = user;
      this.editUserForm.reset({
        employeeId: user.employeeId,
        username: user.username,
        roleId: user.roleId,
        status: user.status,
      });
      this.showEditUser = true;
      this.cdr.detectChanges();
      return;
    }

    this.adminService.getAccountById(accountId).subscribe({
      next: (account) => {
        const accountDetail = this.mapAccountDtoToRecord(account);
        this.selectedUser = accountDetail;
        this.editUserForm.reset({
          employeeId: accountDetail.employeeId,
          username: accountDetail.username,
          roleId: accountDetail.roleId,
          status: accountDetail.status,
        });
        this.showEditUser = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.selectedUser = user;
        this.editUserForm.reset({
          employeeId: user.employeeId,
          username: user.username,
          roleId: user.roleId,
          status: user.status,
        });
        this.showEditUser = true;
        this.cdr.detectChanges();
      },
    });
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
      error: () => {
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
    const roleId = Number(value.roleId);

    if (!Number.isInteger(employeeId) || employeeId <= 0 || !Number.isInteger(roleId) || roleId <= 0) {
      return;
    }

    const request: CreateAccountRequest = {
      employeeId,
      username: String(value.username ?? '').trim(),
      password: String(value.password ?? ''),
      roleId,
      isActive: value.status !== 'inactive',
    };

    this.adminService.createAccount(request).subscribe({
      next: () => {
        this.closeAddUserModal();
        this.loadData();
      },
      error: () => {},
    });
  }

  saveUserEdits(): void {
    if (this.editUserForm.invalid || !this.selectedUser) {
      return;
    }

    const value = this.editUserForm.value;
    const accountId = Number(this.selectedUser.id);
    const roleId = Number(value.roleId);

    if (!Number.isInteger(roleId) || roleId <= 0) {
      return;
    }

    const request: UpdateAccountRequest = {
      username: String(value.username ?? '').trim(),
      roleId,
      isActive: value.status !== 'inactive',
    };

    this.adminService.updateAccount(accountId, request).subscribe({
      next: () => {
        this.closeEditUserModal();
        this.loadData();
      },
      error: () => {
        this.closeEditUserModal();
      },
    });
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
      error: () => {
        this.availableEmployees = [];
        this.cdr.markForCheck();
      },
    });
  }

  private syncDefaultEmployeeForCreateForm(): void {
    if (!this.showAddUser) {
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

  getRoleLabel(roleId: number | null): string {
    if (roleId == null) {
      return 'Unknown';
    }
    return this.accountRoles.find((role) => role.id === roleId)?.name ?? 'Unknown';
  }

  private loadRoles(): void {
    this.adminService.getAccountRoles().subscribe({
      next: (roles) => {
        this.accountRoles = roles;
        const defaultRoleId = this.getDefaultRoleId();
        if (defaultRoleId !== null) {
          this.addUserForm.patchValue({ roleId: defaultRoleId }, { emitEvent: false });
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.accountRoles = [];
        this.cdr.markForCheck();
      },
    });
  }

  private getDefaultRoleId(): number | null {
    return this.findRoleIdByCode('EMPLOYEE') ?? this.accountRoles[0]?.id ?? null;
  }

  private findRoleIdByCode(roleCode: string): number | null {
    const matched = this.accountRoles.find((role) => role.code?.toUpperCase() === roleCode);
    return matched?.id ?? null;
  }

  private trimmedRequiredValidator(control: AbstractControl): ValidationErrors | null {
    return String(control.value ?? '').trim() ? null : { trimmedRequired: true };
  }
}
