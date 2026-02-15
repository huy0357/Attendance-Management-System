import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  HrmService,
  OffboardingProcess,
  OnboardingProcess,
  ProcessStats,
  ProcessTask,
  ProcessTemplate,
  TaskCategory,
  NewProcessPayload,
} from '../hrm.service';

interface TabOption {
  id: 'onboarding' | 'offboarding' | 'templates';
  label: string;
  icon: string;
}

interface EmployeeOption {
  id: string;
  label: string;
  name: string;
  department: string;
  position: string;
}

@Component({
  standalone: false,
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss'],
})
export class OnboardingComponent implements OnInit {
  activeTab: 'onboarding' | 'offboarding' | 'templates' = 'onboarding';
  showTaskModal = false;
  showProcessModal = false;

  onboardingStats: ProcessStats = {
    active: 0,
    upcomingOrPending: 0,
    completed: 0,
    averageDurationLabel: '',
  };
  offboardingStats: ProcessStats = {
    active: 0,
    upcomingOrPending: 0,
    completed: 0,
    averageDurationLabel: '',
  };

  onboardingList: OnboardingProcess[] = [];
  offboardingList: OffboardingProcess[] = [];

  templates: ProcessTemplate[] = [];
  taskCategories: TaskCategory[] = [];

  selectedProcess: OnboardingProcess | OffboardingProcess | null = null;
  selectedTasks: ProcessTask[] = [];

  processForm: FormGroup;

  readonly tabs: TabOption[] = [
    { id: 'onboarding', label: 'Onboarding', icon: 'user-plus' },
    { id: 'offboarding', label: 'Offboarding', icon: 'user-minus' },
    { id: 'templates', label: 'Task Templates', icon: 'check-square' },
  ];

  readonly employeeOptions: EmployeeOption[] = [
    { id: 'E001', label: 'Sarah Chen (E001)', name: 'Sarah Chen', department: 'Operations', position: 'VP Operations' },
    { id: 'E002', label: 'Michael Ross (E002)', name: 'Michael Ross', department: 'Sales', position: 'VP Sales' },
    { id: 'E003', label: 'Emma Wilson (E003)', name: 'Emma Wilson', department: 'HR', position: 'VP Human Resources' },
  ];

  readonly offboardingReasons: string[] = ['Resignation', 'Termination', 'Retirement', 'Contract End', 'Other'];

  constructor(private hrmService: HrmService, private fb: FormBuilder) {
    this.processForm = this.fb.group({
      employeeId: ['', Validators.required],
      startDate: [''],
      lastDay: [''],
      reason: [''],
      templateId: ['', Validators.required],
      notes: [''],
    });
  }

  ngOnInit(): void {
    this.hrmService.getOnboardingStats().subscribe((stats) => (this.onboardingStats = stats));
    this.hrmService.getOffboardingStats().subscribe((stats) => (this.offboardingStats = stats));
    this.hrmService.getOnboardingList().subscribe((data) => (this.onboardingList = data));
    this.hrmService.getOffboardingList().subscribe((data) => (this.offboardingList = data));
    this.hrmService.getProcessTemplates().subscribe((data) => (this.templates = data));
    this.hrmService.getTaskCategories().subscribe((data) => (this.taskCategories = data));
  }

  setActiveTab(tab: 'onboarding' | 'offboarding' | 'templates'): void {
    this.activeTab = tab;
  }

  isActiveTab(tab: 'onboarding' | 'offboarding' | 'templates'): boolean {
    return this.activeTab === tab;
  }

  openProcessModal(): void {
    this.processForm.reset({
      employeeId: '',
      startDate: '',
      lastDay: '',
      reason: '',
      templateId: '',
      notes: '',
    });
    this.showProcessModal = true;
  }

  closeProcessModal(): void {
    this.showProcessModal = false;
  }

  openTaskModal(process: OnboardingProcess | OffboardingProcess): void {
    this.selectedProcess = process;
    const taskId = this.activeTab === 'offboarding' ? 'offboarding' : 'onboarding';
    this.hrmService.getTaskDetails(taskId).subscribe((tasks) => {
      this.selectedTasks = tasks;
      this.showTaskModal = true;
    });
  }

  closeTaskModal(): void {
    this.showTaskModal = false;
    this.selectedProcess = null;
    this.selectedTasks = [];
  }

  createProcess(): void {
    if (this.processForm.invalid) return;

    const value = this.processForm.value as {
      employeeId: string;
      startDate: string;
      lastDay: string;
      reason: string;
      templateId: string;
      notes: string;
    };

    const employee = this.getEmployeeOption(value.employeeId);
    const payload: NewProcessPayload = {
      type: this.getProcessType(),
      employeeId: value.employeeId,
      employeeName: employee?.name || 'Employee',
      department: employee?.department || 'Department',
      position: employee?.position,
      startDate: value.startDate,
      lastDay: value.lastDay,
      reason: value.reason,
      templateId: value.templateId,
      notes: value.notes,
    };

    this.hrmService.createNewProcess(payload).subscribe(() => {
      this.showProcessModal = false;
    });
  }

  getOnboardingStatusLabel(status: OnboardingProcess['status']): string {
    if (status === 'not-started') return 'Not Started';
    if (status === 'in-progress') return 'In Progress';
    return 'Completed';
  }

  getOnboardingStatusClass(status: OnboardingProcess['status']): string {
    if (status === 'completed') return 'bg-green-100 text-green-700';
    if (status === 'in-progress') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  }

  getOnboardingProgressClass(status: OnboardingProcess['status']): string {
    return status === 'completed' ? 'bg-green-600' : 'bg-blue-600';
  }

  getOffboardingStatusLabel(status: OffboardingProcess['status']): string {
    if (status === 'initiated') return 'Initiated';
    if (status === 'in-progress') return 'In Progress';
    return 'Completed';
  }

  getOffboardingStatusClass(status: OffboardingProcess['status']): string {
    if (status === 'completed') return 'bg-green-100 text-green-700';
    if (status === 'in-progress') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  }

  getOffboardingProgressClass(status: OffboardingProcess['status']): string {
    return status === 'completed' ? 'bg-green-600' : 'bg-yellow-600';
  }

  getTemplatesByType(type: 'onboarding' | 'offboarding'): ProcessTemplate[] {
    return this.templates.filter((template) => template.type === type);
  }

  getTemplateMeta(template: ProcessTemplate): string {
    return `${template.taskCount} tasks • ${template.timelineDays} days timeline`;
  }

  getCategoryList(type: 'onboarding' | 'offboarding'): TaskCategory[] {
    return this.taskCategories.filter((category) => category.type === type);
  }

  getTasksByCategory(category: string): ProcessTask[] {
    return this.selectedTasks.filter((task) => task.category === category);
  }

  getCompletedCount(category: string): number {
    const tasks = this.getTasksByCategory(category);
    let count = 0;
    for (const task of tasks) {
      if (task.status === 'completed') count += 1;
    }
    return count;
  }

  getTaskStatusClass(status: ProcessTask['status']): string {
    if (status === 'completed') return 'bg-green-100 text-green-700';
    if (status === 'in-progress') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  }

  getTaskBorderClass(status: ProcessTask['status']): string {
    if (status === 'completed') return 'border-green-600';
    if (status === 'in-progress') return 'border-blue-600';
    return 'border-gray-300';
  }

  getTaskToggleClass(status: ProcessTask['status']): string {
    return status === 'completed'
      ? 'bg-green-600 border-green-600'
      : 'border-gray-300 hover:border-blue-600';
  }

  getTaskTitleClass(status: ProcessTask['status']): string {
    return status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900';
  }

  getTaskStatusLabel(status: ProcessTask['status']): string {
    if (status === 'in-progress') return 'In Progress';
    if (status === 'completed') return 'Completed';
    return 'Pending';
  }

  getSelectedEmployeeName(): string {
    const employee = this.selectedProcess as OnboardingProcess | OffboardingProcess | null;
    return employee ? employee.employeeName : '';
  }

  isOffboardingMode(): boolean {
    return this.activeTab === 'offboarding';
  }

  getProcessModalTitle(): string {
    return this.activeTab === 'onboarding' ? 'New Onboarding Process' : 'New Offboarding Process';
  }

  getDateLabel(): string {
    return this.activeTab === 'onboarding' ? 'Start Date' : 'Last Working Day';
  }

  getEmployeeOption(employeeId: string): EmployeeOption | null {
    const match = this.employeeOptions.find((option) => option.id === employeeId);
    return match || null;
  }

  getTaskModalTitle(): string {
    return this.activeTab === 'onboarding' ? 'Onboarding Checklist' : 'Offboarding Checklist';
  }

  getTaskModalActionLabel(): string {
    return this.activeTab === 'onboarding' ? 'Save Progress' : 'Save Progress';
  }

  getTemplateOptions(): ProcessTemplate[] {
    const type = this.activeTab === 'offboarding' ? 'offboarding' : 'onboarding';
    return this.getTemplatesByType(type);
  }

  getProcessType(): 'onboarding' | 'offboarding' {
    return this.activeTab === 'offboarding' ? 'offboarding' : 'onboarding';
  }
}









