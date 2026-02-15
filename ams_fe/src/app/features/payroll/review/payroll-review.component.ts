import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PayrollEmployee, PayrollService } from '../payroll.service';

@Component({
  standalone: false,
  selector: 'app-payroll-review',
  templateUrl: './payroll-review.component.html',
  styleUrls: ['./payroll-review.component.scss'],
})
export class PayrollReviewComponent implements OnInit {
  employees: PayrollEmployee[] = [];
  filteredEmployees: PayrollEmployee[] = [];
  selectedEmployees: string[] = [];
  compareMode = false;
  selectedForPreview: string | null = '1';
  sendingProgress: number | null = null;

  filterForm: FormGroup;

  constructor(private payrollService: PayrollService, private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      searchQuery: [''],
    });
  }

  ngOnInit(): void {
    this.payrollService.getPayrollEmployees().subscribe((data) => {
      this.employees = data;
      this.filteredEmployees = data;
      if (!this.selectedForPreview && data.length) {
        this.selectedForPreview = data[0].id;
      }
    });

    this.filterForm.valueChanges.subscribe(() => this.applyFilters());
  }

  get totalPayroll(): number {
    return this.employees.reduce((sum, emp) => sum + emp.total, 0);
  }

  get pendingCount(): number {
    return this.employees.filter((emp) => emp.status === 'pending').length;
  }

  get readyCount(): number {
    return this.employees.filter((emp) => emp.status === 'approved').length;
  }

  get selectedEmployee(): PayrollEmployee | undefined {
    return this.employees.find((emp) => emp.id === this.selectedForPreview);
  }

  applyFilters(): void {
    const { searchQuery } = this.filterForm.value as { searchQuery: string };
    const query = (searchQuery || '').toLowerCase();
    this.filteredEmployees = this.employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(query) ||
        emp.department.toLowerCase().includes(query),
    );
  }

  handleSelectAll(): void {
    if (this.selectedEmployees.length === this.filteredEmployees.length) {
      this.selectedEmployees = [];
      return;
    }
    this.selectedEmployees = this.filteredEmployees.map((emp) => emp.id);
  }

  handleSelectEmployee(id: string): void {
    if (this.selectedEmployees.includes(id)) {
      this.selectedEmployees = this.selectedEmployees.filter((empId) => empId !== id);
      return;
    }
    this.selectedEmployees = [...this.selectedEmployees, id];
  }

  toggleCompareMode(): void {
    this.compareMode = !this.compareMode;
  }

  setPreviewEmployee(id: string): void {
    this.selectedForPreview = id;
  }

  handleBulkSend(): void {
    if (this.selectedEmployees.length === 0) return;
    this.sendingProgress = 0;
    const intervalId = window.setInterval(() => {
      if (this.sendingProgress === null) {
        window.clearInterval(intervalId);
        return;
      }
      if (this.sendingProgress >= 100) {
        window.clearInterval(intervalId);
        window.setTimeout(() => {
          this.sendingProgress = null;
        }, 1000);
        return;
      }
      this.sendingProgress += 10;
    }, 200);
  }

  getDiff(current: number, last: number): { diff: number; percentage: number } {
    const diff = current - last;
    const percentage = parseFloat(((diff / last) * 100).toFixed(1));
    return { diff, percentage };
  }

  getChangeBadgeClass(diff: { diff: number; percentage: number }): string {
    const base = diff.diff > 0 ? 'bg-emerald-100 text-emerald-500' : 'bg-red-100 text-red-500';
    const isLargeChange = Math.abs(diff.percentage) > 10;
    return isLargeChange ? `${base} ring-2 ring-amber-500` : base;
  }

  formatCurrency(value: number): string {
    return value.toLocaleString();
  }
}

