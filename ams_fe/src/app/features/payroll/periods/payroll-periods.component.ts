import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LockHistory, PayrollPeriod, PayrollService } from '../payroll.service';

@Component({
  standalone: false,
  selector: 'app-payroll-periods',
  templateUrl: './payroll-periods.component.html',
  styleUrls: ['./payroll-periods.component.scss'],
})
export class PayrollPeriodsComponent implements OnInit {
  periods: PayrollPeriod[] = [];
  lockHistory: LockHistory[] = [];

  showAddModal = false;
  showLockModal = false;
  showUnlockModal = false;
  showDetailsModal = false;
  selectedPeriod: PayrollPeriod | null = null;

  addPeriodForm: FormGroup;
  unlockForm: FormGroup;

  constructor(private payrollService: PayrollService, private fb: FormBuilder) {
    this.addPeriodForm = this.fb.group({
      name: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      payDate: ['', Validators.required],
      notes: [''],
    });

    this.unlockForm = this.fb.group({
      reason: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.payrollService.getPayrollPeriods().subscribe((data) => (this.periods = data));
    this.payrollService.getLockHistory().subscribe((data) => (this.lockHistory = data));
  }

  get stats(): Array<{ label: string; value: number; color: string; bg: string; icon: string }> {
    return [
      {
        label: 'Total Periods',
        value: this.periods.length,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        icon: 'calendar',
      },
      {
        label: 'Locked Periods',
        value: this.periods.filter((p) => p.status === 'locked').length,
        color: 'text-red-600',
        bg: 'bg-red-50',
        icon: 'lock',
      },
      {
        label: 'Pending Approval',
        value: this.periods.filter((p) => p.status === 'calculated').length,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        icon: 'clock',
      },
      {
        label: 'Current Month',
        value: this.periods.filter((p) => p.status === 'approved').length,
        color: 'text-green-600',
        bg: 'bg-green-50',
        icon: 'check-circle',
      },
    ];
  }

  openAddModal(): void {
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.addPeriodForm.reset({
      name: '',
      startDate: '',
      endDate: '',
      payDate: '',
      notes: '',
    });
  }

  openLockModal(period: PayrollPeriod): void {
    this.selectedPeriod = period;
    this.showLockModal = true;
  }

  openUnlockModal(period: PayrollPeriod): void {
    this.selectedPeriod = period;
    this.showUnlockModal = true;
  }

  openDetailsModal(period: PayrollPeriod): void {
    this.selectedPeriod = period;
    this.showDetailsModal = true;
  }

  closeLockModal(): void {
    this.showLockModal = false;
    this.selectedPeriod = null;
  }

  closeUnlockModal(): void {
    this.showUnlockModal = false;
    this.selectedPeriod = null;
    this.unlockForm.reset({ reason: '', password: '' });
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedPeriod = null;
  }

  handleLockPeriod(): void {
    if (!this.selectedPeriod) return;
    this.periods = this.periods.map((p) =>
      p.id === this.selectedPeriod?.id
        ? {
            ...p,
            status: 'locked',
            lockDate: new Date().toISOString().split('T')[0],
            lockedBy: 'Admin User',
          }
        : p,
    );
    this.showLockModal = false;
    this.selectedPeriod = null;
  }

  handleUnlockPeriod(): void {
    if (!this.selectedPeriod) return;
    if (this.unlockForm.invalid) {
      window.alert('Please provide unlock reason and password');
      return;
    }
    const { password } = this.unlockForm.value as { password: string };
    if (password !== 'admin123') {
      window.alert('Invalid password');
      return;
    }
    this.periods = this.periods.map((p) =>
      p.id === this.selectedPeriod?.id
        ? {
            ...p,
            status: 'approved',
            lockDate: undefined,
            lockedBy: undefined,
          }
        : p,
    );
    this.showUnlockModal = false;
    this.selectedPeriod = null;
    this.unlockForm.reset({ reason: '', password: '' });
  }

  handleAddPeriod(): void {
    if (this.addPeriodForm.invalid) return;
    const value = this.addPeriodForm.value as {
      name: string;
      startDate: string;
      endDate: string;
      payDate: string;
      notes: string;
    };
    const period: PayrollPeriod = {
      id: `PP-${value.startDate.substring(0, 7)}`,
      name: value.name,
      startDate: value.startDate,
      endDate: value.endDate,
      payDate: value.payDate,
      status: 'draft',
      totalEmployees: 247,
      totalAmount: 0,
      notes: value.notes,
    };
    this.periods = [period, ...this.periods];
    this.closeAddModal();
  }

  getStatusBadgeClass(status: PayrollPeriod['status']): string {
    const styles: Record<PayrollPeriod['status'], string> = {
      draft: 'bg-gray-100 text-gray-700 border-gray-300',
      calculated: 'bg-blue-100 text-blue-700 border-blue-300',
      approved: 'bg-green-100 text-green-700 border-green-300',
      locked: 'bg-red-100 text-red-700 border-red-300',
    };
    return styles[status];
  }

  getStatusLabel(status: PayrollPeriod['status']): string {
    const labels: Record<PayrollPeriod['status'], string> = {
      draft: 'Draft',
      calculated: 'Calculated',
      approved: 'Approved',
      locked: 'Locked',
    };
    return labels[status];
  }

  getStatusIcon(status: PayrollPeriod['status']): string {
    const icons: Record<PayrollPeriod['status'], string> = {
      draft: 'edit',
      calculated: 'file-check',
      approved: 'check-circle',
      locked: 'lock',
    };
    return icons[status];
  }

  formatDate(dateValue?: string): string {
    if (!dateValue) return '';
    return new Date(dateValue).toLocaleDateString();
  }
}

