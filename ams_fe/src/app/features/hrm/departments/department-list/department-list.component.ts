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
        ).subscribe(query => {
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
        this.departmentService.getAll(this.currentPage, this.pageSize, this.searchQuery).subscribe({
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
            error: () => {
                // Handle error siliently or show notification
                console.error('Failed to load department tree');
            }
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

    // Actions
    openAddModal(): void {
        this.departmentForm.reset({ isActive: true });
        this.showAddModal = true;
    }

    openEditModal(dept: DepartmentDto): void {
        this.selectedDepartment = dept;
        this.departmentForm.patchValue({
            departmentName: dept.departmentName,
            departmentCode: dept.departmentCode,
            parentDepartmentId: dept.parentDepartmentId,
            isActive: dept.isActive
        });
        this.showEditModal = true;
    }

    openDeleteModal(dept: DepartmentDto): void {
        this.selectedDepartment = dept;
        this.showDeleteModal = true;
    }

    // CRUD
    saveDepartment(): void {
        if (this.departmentForm.invalid) return;

        const modalClose = () => {
            this.showAddModal = false;
            this.showEditModal = false;
            this.departmentForm.reset();
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
                this.showDeleteModal = false;
                this.selectedDepartment = null;
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
}
