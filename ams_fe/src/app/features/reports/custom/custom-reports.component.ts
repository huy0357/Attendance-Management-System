import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ReportField,
  ReportFilter,
  ReportOperator,
  SavedReport,
  ReportsService,
} from '../reports.service';

@Component({
  standalone: false,
  selector: 'app-custom-reports',
  templateUrl: './custom-reports.component.html',
  styleUrls: ['./custom-reports.component.scss'],
})
export class CustomReportsComponent implements OnInit {
  activeTab: 'builder' | 'saved' = 'builder';
  selectedFields: string[] = [];
  showPreview = false;
  chartType = 'table';

  reportForm: FormGroup;
  filtersFormArray: FormArray;

  availableFields: ReportField[] = [];
  fieldCategories: string[] = [];
  fieldsByCategory: Record<string, ReportField[]> = {};
  operators: ReportOperator[] = [];
  savedReports: SavedReport[] = [];
  fieldNameById: Record<string, string> = {};
  previewRows: Array<Record<string, string>> = [];

  constructor(private reportsService: ReportsService, private fb: FormBuilder) {
    this.filtersFormArray = this.fb.array([]);
    this.reportForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      category: ['attendance'],
      filters: this.filtersFormArray,
    });
  }

  ngOnInit(): void {
    this.reportsService.getAvailableFields().subscribe((fields) => {
      this.availableFields = fields;
      this.fieldCategories = Array.from(new Set(fields.map((f) => f.category)));
      this.fieldsByCategory = this.fieldCategories.reduce<Record<string, ReportField[]>>((acc, category) => {
        acc[category] = fields.filter((field) => field.category === category);
        return acc;
      }, {});
      this.fieldNameById = fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.id] = field.name;
        return acc;
      }, {});
    });
    this.reportsService.getOperators().subscribe((ops) => (this.operators = ops));
    this.reportsService.getSavedReports().subscribe((reports) => (this.savedReports = reports));
  }

  get filters(): FormArray {
    return this.filtersFormArray;
  }

  setActiveTab(tab: 'builder' | 'saved'): void {
    this.activeTab = tab;
  }

  addFilter(): void {
    this.filters.push(
      this.fb.group({
        id: [Date.now().toString()],
        field: [''],
        operator: ['equals'],
        value: [''],
      }),
    );
  }

  removeFilter(index: number): void {
    this.filters.removeAt(index);
  }

  toggleField(fieldId: string): void {
    if (this.selectedFields.includes(fieldId)) {
      this.selectedFields = this.selectedFields.filter((f) => f !== fieldId);
      return;
    }
    this.selectedFields = [...this.selectedFields, fieldId];
  }

  clearSelectedFields(): void {
    this.selectedFields = [];
  }

  runReport(): void {
    this.showPreview = true;
    this.previewRows = this.buildPreviewRows(this.selectedFields, this.availableFields);
  }

  saveReport(): void {
    if (this.reportForm.invalid) {
      window.alert('Please enter a report name');
      return;
    }
    window.alert(`Report "${this.reportForm.value.name}" saved successfully!`);
    this.reportForm.reset({
      name: '',
      description: '',
      category: 'attendance',
      filters: [],
    });
    this.filters.clear();
    this.selectedFields = [];
  }

  closePreview(): void {
    this.showPreview = false;
  }

  setChartType(type: string): void {
    this.chartType = type;
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      Attendance: 'clock',
      Payroll: 'dollar-sign',
      Leave: 'calendar',
      Performance: 'trending-up',
      Employee: 'users',
    };
    return icons[category] || 'bar-chart-3';
  }

  private buildPreviewRows(selectedFields: string[], fields: ReportField[]): Array<Record<string, string>> {
    if (!selectedFields.length) return [];
    return [1, 2, 3, 4, 5].map((row) => {
      const rowData: Record<string, string> = {};
      selectedFields.forEach((fieldId) => {
        const field = fields.find((f) => f.id === fieldId);
        let value = 'Sample Data';
        if (field?.type === 'number') value = Math.floor(Math.random() * 100).toString();
        if (field?.type === 'date') value = `2025-01-${10 + row}`;
        rowData[fieldId] = value;
      });
      return rowData;
    });
  }
}

