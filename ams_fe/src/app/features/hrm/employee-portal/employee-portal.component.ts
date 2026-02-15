import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  AttendanceRecord,
  EmployeeProfile,
  HrmService,
  OTRequest,
  PayrollRecord,
  ShiftChangeRequest,
} from '../hrm.service';

type EmployeePortalTab = 'profile' | 'attendance' | 'payroll' | 'requests';

type StatusBadge =
  | AttendanceRecord['status']
  | PayrollRecord['status']
  | OTRequest['status']
  | ShiftChangeRequest['status'];

@Component({
  standalone: false,
  selector: 'app-employee-portal',
  templateUrl: './employee-portal.component.html',
  styleUrls: ['./employee-portal.component.scss'],
})
export class EmployeePortalComponent implements OnInit {
  activeTab: EmployeePortalTab = 'profile';
  showOTModal = false;
  showShiftModal = false;
  showPayrollDetailsModal = false;

  employee: EmployeeProfile | null = null;
  attendanceRecords: AttendanceRecord[] = [];
  payrollRecords: PayrollRecord[] = [];
  otRequests: OTRequest[] = [];
  shiftRequests: ShiftChangeRequest[] = [];

  attendanceTotalHours = 0;
  attendanceOvertimeHours = 0;
  attendanceRate = 0;

  otRequestForm: FormGroup;
  shiftRequestForm: FormGroup;

  selectedPayroll: PayrollRecord | null = null;

  readonly tabs: Array<{ id: EmployeePortalTab; label: string; icon: string }> = [
    { id: 'profile', label: 'My Profile', icon: 'user' },
    { id: 'attendance', label: 'Attendance', icon: 'clock' },
    { id: 'payroll', label: 'Payroll', icon: 'dollar-sign' },
    { id: 'requests', label: 'Requests', icon: 'file-text' },
  ];

  constructor(private hrmService: HrmService, private fb: FormBuilder) {
    this.otRequestForm = this.fb.group({
      date: ['', Validators.required],
      hours: ['', Validators.required],
      reason: ['', Validators.required],
    });

    this.shiftRequestForm = this.fb.group({
      currentDate: ['', Validators.required],
      requestedDate: ['', Validators.required],
      reason: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.hrmService.getEmployeeProfile().subscribe((employee) => {
      this.employee = employee;
    });

    this.hrmService.getAttendanceRecords().subscribe((records) => {
      this.attendanceRecords = records;
      this.calculateAttendanceSummary();
    });

    this.hrmService.getPayrollRecords().subscribe((records) => {
      this.payrollRecords = records;
    });

    this.hrmService.getOtRequests().subscribe((requests) => {
      this.otRequests = requests;
    });

    this.hrmService.getShiftChangeRequests().subscribe((requests) => {
      this.shiftRequests = requests;
    });
  }

  get currentPayroll(): PayrollRecord | null {
    return this.payrollRecords.length > 0 ? this.payrollRecords[0] : null;
  }

  get selectedPayrollGrossPay(): number {
    if (!this.selectedPayroll) {
      return 0;
    }
    return this.selectedPayroll.baseSalary + this.selectedPayroll.overtime + this.selectedPayroll.bonus;
  }

  get selectedPayrollTotalDeductions(): number {
    if (!this.selectedPayroll) {
      return 0;
    }
    return this.selectedPayroll.tax + this.selectedPayroll.deductions;
  }

  setTab(tab: EmployeePortalTab): void {
    this.activeTab = tab;
  }

  openOTModal(): void {
    this.otRequestForm.reset({
      date: '',
      hours: '',
      reason: '',
    });
    this.showOTModal = true;
  }

  closeOTModal(): void {
    this.showOTModal = false;
  }

  openShiftModal(): void {
    this.shiftRequestForm.reset({
      currentDate: '',
      requestedDate: '',
      reason: '',
    });
    this.showShiftModal = true;
  }

  closeShiftModal(): void {
    this.showShiftModal = false;
  }

  openPayrollDetails(record: PayrollRecord): void {
    this.selectedPayroll = record;
    this.showPayrollDetailsModal = true;
  }

  closePayrollDetails(): void {
    this.showPayrollDetailsModal = false;
    this.selectedPayroll = null;
  }

  submitOTRequest(): void {
    if (this.otRequestForm.invalid) {
      return;
    }

    const value = this.otRequestForm.value as {
      date: string;
      hours: string;
      reason: string;
    };

    const request: OTRequest = {
      id: `OT-${String(this.otRequests.length + 1).padStart(3, '0')}`,
      date: value.date,
      hours: parseFloat(value.hours),
      reason: value.reason,
      status: 'pending',
    };

    this.otRequests = [request, ...this.otRequests];
    this.showOTModal = false;
  }

  submitShiftRequest(): void {
    if (this.shiftRequestForm.invalid) {
      return;
    }

    const value = this.shiftRequestForm.value as {
      currentDate: string;
      requestedDate: string;
      reason: string;
    };

    const request: ShiftChangeRequest = {
      id: `SH-${String(this.shiftRequests.length + 1).padStart(3, '0')}`,
      currentDate: value.currentDate,
      requestedDate: value.requestedDate,
      reason: value.reason,
      status: 'pending',
    };

    this.shiftRequests = [request, ...this.shiftRequests];
    this.showShiftModal = false;
  }

  getStatusBadgeClasses(status: StatusBadge): string {
    const styles: Record<StatusBadge, string> = {
      present: 'bg-green-100 text-green-700 border-green-300',
      late: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      absent: 'bg-red-100 text-red-700 border-red-300',
      paid: 'bg-green-100 text-green-700 border-green-300',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      processing: 'bg-blue-100 text-blue-700 border-blue-300',
      approved: 'bg-green-100 text-green-700 border-green-300',
      rejected: 'bg-red-100 text-red-700 border-red-300',
    };

    return styles[status];
  }

  getStatusIcon(status: StatusBadge): string {
    const icons: Record<StatusBadge, string> = {
      present: 'check-circle',
      late: 'clock',
      absent: 'x-circle',
      paid: 'check-circle',
      pending: 'clock',
      processing: 'clock',
      approved: 'check-circle',
      rejected: 'x-circle',
    };

    return icons[status];
  }

  getStatusLabel(status: StatusBadge): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  private calculateAttendanceSummary(): void {
    const totalHours = this.attendanceRecords.reduce((sum, record) => sum + record.regularHours, 0);
    const overtimeHours = this.attendanceRecords.reduce((sum, record) => sum + record.overtimeHours, 0);
    const presentCount = this.attendanceRecords.filter((record) => record.status !== 'absent').length;

    this.attendanceTotalHours = totalHours;
    this.attendanceOvertimeHours = overtimeHours;
    this.attendanceRate = this.attendanceRecords.length
      ? Math.round((presentCount / this.attendanceRecords.length) * 100)
      : 0;
  }
}
