import { Component, OnInit } from '@angular/core';
import { AttendanceService, ScheduleEmployee, Shift, ShiftTemplate } from '../attendance.service';

@Component({
  standalone: false,
  selector: 'app-scheduling',
  templateUrl: './scheduling.component.html',
  styleUrls: ['./scheduling.component.scss'],
})
export class SchedulingComponent implements OnInit {
  view: 'week' | 'month' = 'week';
  showAiProposal = false;
  draggedTemplate: ShiftTemplate | null = null;
  dragOver: { day: number; employeeId: string } | null = null;

  templates: ShiftTemplate[] = [];
  employees: ScheduleEmployee[] = [];
  shifts: Shift[] = [];

  readonly days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  constructor(private attendanceService: AttendanceService) { }

  ngOnInit(): void {
    this.attendanceService.getShiftTemplates().subscribe((data) => {
      this.templates = data.map(item => ({
        id: item.id.toString(),
        name: item.shiftName,
        time: `${item.startTime.substring(0, 5)} - ${item.endTime.substring(0, 5)}`,
        type: (item.shiftType.toLowerCase() as 'morning' | 'afternoon' | 'night'),
        color: this.getColorForType(item.shiftType)
      }));
    });
    this.attendanceService.getScheduleEmployees().subscribe((data) => (this.employees = data));
    this.attendanceService.getInitialShifts().subscribe((data) => (this.shifts = data));
  }

  private getColorForType(type: string): string {
    const t = type.toLowerCase();
    if (t === 'morning') return 'bg-blue-100 text-blue-700 border-blue-300';
    if (t === 'afternoon') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    if (t === 'night') return 'bg-purple-100 text-purple-700 border-purple-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  }

  setView(view: 'week' | 'month'): void {
    this.view = view;
  }

  handleDragStart(template: ShiftTemplate): void {
    this.draggedTemplate = template;
  }

  handleDragEnd(): void {
    this.draggedTemplate = null;
  }

  onDragOver(event: DragEvent, employeeId: string, day: number): void {
    event.preventDefault();
    this.dragOver = { day, employeeId };
  }

  onDragLeave(): void {
    this.dragOver = null;
  }

  handleDrop(employeeId: string, day: number): void {
    if (!this.draggedTemplate) return;

    const hasConflict = this.shifts.some((shift) => shift.employeeId === employeeId && shift.day === day);
    if (hasConflict) {
      window.alert('Conflict detected! Employee already has a shift on this day.');
      return;
    }

    const employee = this.employees.find((e) => e.id === employeeId);
    const newShift: Shift = {
      id: Date.now().toString(),
      employeeId,
      employeeName: employee?.name || '',
      day,
      startTime: this.draggedTemplate.time.split(' - ')[0],
      endTime: this.draggedTemplate.time.split(' - ')[1],
      type: this.draggedTemplate.type,
    };

    this.shifts = [...this.shifts, newShift];
    this.draggedTemplate = null;
    this.dragOver = null;
  }

  handleAiAutoSchedule(): void {
    this.showAiProposal = true;
  }

  applyAiSchedule(): void {
    const aiShifts: Shift[] = [];
    this.employees.forEach((emp, empIndex) => {
      this.days.forEach((_, dayIndex) => {
        const hasShift = this.shifts.some((s) => s.employeeId === emp.id && s.day === dayIndex);
        if (!hasShift && Math.random() > 0.5) {
          const template = this.templates[Math.floor(Math.random() * this.templates.length)];
          aiShifts.push({
            id: `ai-${Date.now()}-${empIndex}-${dayIndex}`,
            employeeId: emp.id,
            employeeName: emp.name,
            day: dayIndex,
            startTime: template.time.split(' - ')[0],
            endTime: template.time.split(' - ')[1],
            type: template.type,
            isAiGenerated: true,
          });
        }
      });
    });
    this.shifts = [...this.shifts, ...aiShifts];
    this.showAiProposal = false;
  }

  getShift(employeeId: string, dayIndex: number): Shift | undefined {
    return this.shifts.find((s) => s.employeeId === employeeId && s.day === dayIndex);
  }

  isDragOver(employeeId: string, dayIndex: number): boolean {
    return this.dragOver?.day === dayIndex && this.dragOver?.employeeId === employeeId;
  }

  removeShift(shiftId: string): void {
    this.shifts = this.shifts.filter((s) => s.id !== shiftId);
  }

  getCoveragePercent(): string {
    const percent = (this.shifts.length / 42) * 100;
    return `${percent}%`;
  }

  getAiGeneratedCount(): number {
    return this.shifts.filter((s) => s.isAiGenerated).length;
  }

  getTemplateColor(type: Shift['type']): string {
    const template = this.templates.find((t) => t.type === type);
    return template ? template.color : '';
  }
}

