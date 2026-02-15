import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AttendanceService, CalculationRule, EmployeeTimeData, TimeRecord } from '../attendance.service';

@Component({
  standalone: false,
  selector: 'app-time-calculation',
  templateUrl: './time-calculation.component.html',
  styleUrls: ['./time-calculation.component.scss'],
})
export class TimeCalculationComponent implements OnInit {
  filterForm: FormGroup;
  calculationRules: CalculationRule[] = [];
  employeesData: EmployeeTimeData[] = [];
  selectedRecord: TimeRecord | null = null;

  showRulesModal = false;
  showCalculationDetailsModal = false;

  constructor(private attendanceService: AttendanceService, private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      employeeId: ['EMP-001'],
      period: ['2026-01'],
    });
  }

  ngOnInit(): void {
    this.attendanceService.getCalculationRules().subscribe((rules) => (this.calculationRules = rules));
    this.attendanceService.getEmployeeTimeData().subscribe((data) => (this.employeesData = data));
  }

  get selectedEmployeeData(): EmployeeTimeData | undefined {
    const { employeeId } = this.filterForm.value as { employeeId: string };
    return this.employeesData.find((e) => e.id === employeeId);
  }

  openRulesModal(): void {
    this.showRulesModal = true;
  }

  closeRulesModal(): void {
    this.showRulesModal = false;
  }

  openCalculationDetails(record: TimeRecord): void {
    this.selectedRecord = record;
    this.showCalculationDetailsModal = true;
  }

  closeCalculationDetails(): void {
    this.showCalculationDetailsModal = false;
    this.selectedRecord = null;
  }

  calculateTimeDifference(time1: string, time2: string): number {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    const totalMinutes1 = h1 * 60 + m1;
    const totalMinutes2 = h2 * 60 + m2;
    return (totalMinutes2 - totalMinutes1) / 60;
  }

  getStatusBadgeClass(status: TimeRecord['status']): string {
    const styles: Record<TimeRecord['status'], string> = {
      'on-time': 'bg-green-100 text-green-700 border-green-300',
      late: 'bg-red-100 text-red-700 border-red-300',
      'early-leave': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      absent: 'bg-gray-100 text-gray-700 border-gray-300',
      overtime: 'bg-blue-100 text-blue-700 border-blue-300',
    };
    return styles[status];
  }

  getStatusLabel(status: TimeRecord['status']): string {
    const labels: Record<TimeRecord['status'], string> = {
      'on-time': 'On Time',
      late: 'Late',
      'early-leave': 'Early Leave',
      absent: 'Absent',
      overtime: 'Overtime',
    };
    return labels[status];
  }

  formatDate(dateValue: string): string {
    return new Date(dateValue).toLocaleDateString();
  }

  formatWeekday(dateValue: string): string {
    return new Date(dateValue).toLocaleDateString('en-US', { weekday: 'short' });
  }

  getViolationRecords(employee: EmployeeTimeData): TimeRecord[] {
    return employee.records.filter((record) => record.violations.length > 0);
  }
}

