import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import {
  AttendanceTrend,
  DepartmentStat,
  ReportType,
  TopPerformer,
  ReportsService,
} from '../reports.service';

@Component({
  standalone: false,
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
})
export class ReportsComponent implements OnInit {
  reportTypes: ReportType[] = [];
  attendanceData: AttendanceTrend[] = [];
  departmentStats: DepartmentStat[] = [];
  topPerformers: TopPerformer[] = [];

  selectedReport: ReportType['id'] = 'attendance';
  showFilters = false;
  exportType: 'pdf' | 'excel' | 'csv' | null = null;

  filtersForm: FormGroup;

  quickStats = [
    { label: 'On-time Rate', value: '87%', color: 'bg-green-600', width: '87%' },
    { label: 'Late Arrivals', value: '9%', color: 'bg-yellow-600', width: '9%' },
    { label: 'Absences', value: '4%', color: 'bg-red-600', width: '4%' },
  ];

  constructor(private reportsService: ReportsService, private fb: FormBuilder) {
    this.filtersForm = this.fb.group({
      dateRange: ['Last 30 Days'],
      department: ['All Departments'],
      employeeType: ['All Employees'],
      location: ['All Locations'],
    });
  }

  ngOnInit(): void {
    this.reportsService.getReportTypes().subscribe((types) => (this.reportTypes = types));
    this.reportsService.getAttendanceTrends().subscribe((data) => (this.attendanceData = data));
    this.reportsService.getDepartmentStats().subscribe((data) => (this.departmentStats = data));
    this.reportsService.getTopPerformers().subscribe((data) => (this.topPerformers = data));
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  selectReport(reportId: ReportType['id']): void {
    this.selectedReport = reportId;
  }

  handleExport(type: 'pdf' | 'excel' | 'csv'): void {
    this.exportType = type;
    setTimeout(() => {
      window.alert(`Exporting ${this.selectedReport} report as ${type.toUpperCase()}...`);
      this.exportType = null;
    }, 500);
  }
}

