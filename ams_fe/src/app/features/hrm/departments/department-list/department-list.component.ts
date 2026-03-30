import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DepartmentService } from '../department.service';
import { DepartmentDto } from '../../../../shared/models/department.model';

@Component({
    standalone: false,
    selector: 'app-department-list',
    templateUrl: './department-list.component.html',
    styleUrls: ['./department-list.component.scss']
})
export class DepartmentListComponent implements OnInit, OnDestroy {
    // State
    departments: DepartmentDto[] = [];
    allDepartments: DepartmentDto[] = []; // For parent dropdown
    isLoading = false;
    apiError = false;

    // Stats
    activeCount = 0;
    inactiveCount = 0;
    rootCount = 0;

    // Pagination
    currentPage = 1;
    pageSize = 10;
    totalItems = 0;
    totalPages = 0;
    sortBy: 'departmentId' | 'departmentName' | 'departmentCode' = 'departmentId';
    sortDir: 'asc' | 'desc' = 'desc';
    readonly pageSizeOptions = [10, 20, 50];
    readonly sortOptions = [
        { value: 'departmentId', label: 'Department ID' },
        { value: 'departmentName', label: 'Department Name' },
        { value: 'departmentCode', label: 'Department Code' },
    ];

    // Search
    searchQuery = '';
    private searchSubject = new Subject<string>();
    private searchSubscription?: Subscription;

    // Modals
    showAddModal = false;
    showEditModal = false;
    showDeleteModal = false;
    selectedDepartment: DepartmentDto | null = null;

    // Forms
    departmentForm: FormGroup;

    constructor(
        private departmentService: DepartmentService,
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef
    ) {
        this.departmentForm = this.fb.group({
            departmentName: ['', Validators.required],
            departmentCode: ['', Validators.required],
            parentDepartmentId: [null],
            isActive: [true]
        });
    }

    ngOnInit(): void {
        this.loadDepartments();
        this.setupSearch();
        this.loadAllDepartmentsForDropdown();
    }

    ngOnDestroy(): void {
        this.searchSubscription?.unsubscribe();
    }

    setupSearch(): void {
        this.searchSubscription = this.searchSubject.pipe(
            debounceTime(400),
            distinctUntilChanged()
        ).subscribe(() => {
            this.currentPage = 1;
            this.loadDepartments();
        });
    }

    onSearchChange(): void {
        this.searchSubject.next(this.searchQuery);
    }

    loadDepartments(): void {
        this.isLoading = true;
        this.apiError = false;
        this.departmentService.getAll(this.currentPage, this.pageSize, this.searchQuery, this.sortBy, this.sortDir).subscribe({
            next: (response) => {
                this.departments = response.items;
                this.totalItems = response.totalItems;
                this.totalPages = response.totalPages;
                this.isLoading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.isLoading = false;
                this.apiError = true;
                this.cdr.markForCheck();
            }
        });
    }

    loadAllDepartmentsForDropdown(): void {
        this.departmentService.getTree().subscribe({
            next: (tree) => {
                this.allDepartments = this.flattenTree(tree);
                this.calculateStats();
            },
            error: () => {}
        });
    }

    private flattenTree(nodes: DepartmentDto[]): DepartmentDto[] {
        let result: DepartmentDto[] = [];
        for (const node of nodes) {
            result.push(node);
            if (node.children && node.children.length > 0) {
                result = result.concat(this.flattenTree(node.children));
            }
        }
        return result;
    }

    calculateStats(): void {
        this.activeCount = this.allDepartments.filter(d => d.isActive).length;
        this.inactiveCount = this.allDepartments.length - this.activeCount;
        this.rootCount = this.allDepartments.filter(d => !d.parentDepartmentId).length;
    }

    trackByDepartmentId(_: number, department: DepartmentDto): number {
        return department.departmentId;
    }

    // Pagination
    goToPage(page: number): void {
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
            this.currentPage = page;
            this.loadDepartments();
        }
    }

    nextPage(): void {
        this.goToPage(this.currentPage + 1);
    }

    prevPage(): void {
        this.goToPage(this.currentPage - 1);
    }

    onSortChange(): void {
        this.currentPage = 1;
        this.loadDepartments();
    }

    onPageSizeChange(): void {
        this.currentPage = 1;
        this.loadDepartments();
    }

    // Actions
    openAddModal(): void {
        this.showEditModal = false;
        this.showDeleteModal = false;
        this.selectedDepartment = null;
        this.departmentForm.reset({ isActive: true });
        this.showAddModal = true;
    }

    openEditModal(dept: DepartmentDto): void {
        this.showAddModal = false;
        this.showDeleteModal = false;
        this.departmentService.getById(dept.departmentId).subscribe({
            next: (detail) => {
                this.selectedDepartment = detail;
                this.departmentForm.reset({
                    departmentName: detail.departmentName,
                    departmentCode: detail.departmentCode,
                    parentDepartmentId: detail.parentDepartmentId,
                    isActive: detail.isActive
                });
                this.showEditModal = true;
                this.cdr.markForCheck();
            },
            error: () => {
                this.selectedDepartment = dept;
                this.departmentForm.reset({
                    departmentName: dept.departmentName,
                    departmentCode: dept.departmentCode,
                    parentDepartmentId: dept.parentDepartmentId,
                    isActive: dept.isActive
                });
                this.showEditModal = true;
                this.cdr.markForCheck();
            }
        });
    }

    openDeleteModal(dept: DepartmentDto): void {
        this.showAddModal = false;
        this.showEditModal = false;
        this.selectedDepartment = dept;
        this.showDeleteModal = true;
    }

    closeFormModal(): void {
        this.showAddModal = false;
        this.showEditModal = false;
        this.selectedDepartment = null;
        this.departmentForm.reset({ isActive: true });
    }

    closeDeleteModal(): void {
        this.showDeleteModal = false;
        this.selectedDepartment = null;
    }

    // CRUD
    saveDepartment(): void {
        if (this.departmentForm.invalid) {
            this.departmentForm.markAllAsTouched();
            return;
        }

        if (this.isSelfParentSelected()) {
            this.departmentForm.get('parentDepartmentId')?.setErrors({ selfParent: true });
            this.departmentForm.markAllAsTouched();
            return;
        }

        const modalClose = () => {
            this.closeFormModal();
            this.loadDepartments();
            this.loadAllDepartmentsForDropdown(); // refresh options
        };

        if (this.showEditModal && this.selectedDepartment) {
            this.departmentService.update(this.selectedDepartment.departmentId, this.departmentForm.value).subscribe({
                next: modalClose,
                error: () => alert('Failed to update department')
            });
        } else {
            this.departmentService.create(this.departmentForm.value).subscribe({
                next: modalClose,
                error: () => alert('Failed to create department')
            });
        }
    }

    confirmDelete(): void {
        if (!this.selectedDepartment) return;
        this.departmentService.delete(this.selectedDepartment.departmentId).subscribe({
            next: () => {
                this.closeDeleteModal();
                this.loadDepartments();
                this.loadAllDepartmentsForDropdown();
            },
            error: () => alert('Failed to delete department')
        });
    }

    getBadgeClass(isActive: boolean): string {
        return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
    }

    get startItemIndex(): number {
        if (this.totalItems === 0) return 0;
        return (this.currentPage - 1) * this.pageSize + 1;
    }

    get endItemIndex(): number {
        return Math.min(this.currentPage * this.pageSize, this.totalItems);
    }

    private isSelfParentSelected(): boolean {
        if (!this.showEditModal || !this.selectedDepartment) {
            return false;
        }

        const parentDepartmentId = Number(this.departmentForm.get('parentDepartmentId')?.value);
        return Number.isInteger(parentDepartmentId) && parentDepartmentId === this.selectedDepartment.departmentId;
    }
}
