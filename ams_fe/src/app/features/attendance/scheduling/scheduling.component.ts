import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
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
  private weekStart: Date = this.getWeekStart(new Date());

  readonly days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  constructor(private attendanceService: AttendanceService) { }

  ngOnInit(): void {
    this.attendanceService.getShiftTemplates().subscribe((data) => {
      this.templates = data.map(item => ({
        id: item.shiftId.toString(),
        name: item.shiftName,
        time: `${item.startTime.substring(0, 5)} - ${item.endTime.substring(0, 5)}`,
        type: this.deriveShiftType(item.isNightShift, item.startTime),
        color: this.getColorForType(this.deriveShiftType(item.isNightShift, item.startTime))
      }));
    });
    this.attendanceService.getScheduleEmployees().subscribe((data) => {
      this.employees = data;
      const employeeIds = data
        .map((emp) => Number(emp.id))
        .filter((id) => Number.isFinite(id));
      this.attendanceService.getInitialShifts(employeeIds, this.weekStart).subscribe((data) => {
        this.shifts = data.map((shift) => ({
          ...shift,
          employeeName: this.getEmployeeName(shift.employeeId),
        }));
      });
    });
  }

  private getColorForType(type: Shift['type']): string {
    if (type === 'morning') return 'bg-blue-100 text-blue-700 border-blue-300';
    if (type === 'afternoon') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    if (type === 'night') return 'bg-purple-100 text-purple-700 border-purple-300';
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
    const employeeIdNum = Number(employeeId);
    const shiftIdNum = Number(this.draggedTemplate.id);
    if (!Number.isFinite(employeeIdNum) || !Number.isFinite(shiftIdNum)) {
      window.alert('Invalid employee or shift template.');
      return;
    }
    const workDate = this.formatDate(this.addDays(this.weekStart, day));

    this.attendanceService.assignShiftRange({
      employeeId: employeeIdNum,
      shiftId: shiftIdNum,
      startDate: workDate,
      endDate: workDate,
      scheduleSource: 'MANUAL',
      overwrite: true,
    }).subscribe({
      next: () => {
        const newShift: Shift = {
          id: Date.now().toString(),
          employeeId,
          employeeName: employee?.name || '',
          day,
          startTime: this.draggedTemplate!.time.split(' - ')[0],
          endTime: this.draggedTemplate!.time.split(' - ')[1],
          type: this.draggedTemplate!.type,
          shiftId: shiftIdNum,
          workDate,
        };

        this.shifts = [...this.shifts, newShift];
        this.draggedTemplate = null;
        this.dragOver = null;
      },
      error: () => {
        window.alert('Unable to assign shift. Please try again.');
      },
    });
  }

  handleAiAutoSchedule(): void {
    this.showAiProposal = true;
  }

  applyAiSchedule(): void {
    const aiShifts: Shift[] = [];
    const requests: Array<ReturnType<AttendanceService['assignShiftRange']>> = [];
    this.employees.forEach((emp, empIndex) => {
      this.days.forEach((_, dayIndex) => {
        const hasShift = this.shifts.some((s) => s.employeeId === emp.id && s.day === dayIndex);
        if (!hasShift && Math.random() > 0.5) {
          const template = this.templates[Math.floor(Math.random() * this.templates.length)];
          const employeeIdNum = Number(emp.id);
          const shiftIdNum = Number(template.id);
          if (!Number.isFinite(employeeIdNum) || !Number.isFinite(shiftIdNum)) {
            return;
          }
          const workDate = this.formatDate(this.addDays(this.weekStart, dayIndex));
          aiShifts.push({
            id: `ai-${Date.now()}-${empIndex}-${dayIndex}`,
            employeeId: emp.id,
            employeeName: emp.name,
            day: dayIndex,
            startTime: template.time.split(' - ')[0],
            endTime: template.time.split(' - ')[1],
            type: template.type,
            shiftId: shiftIdNum,
            workDate,
            isAiGenerated: true,
          });
          requests.push(
            this.attendanceService.assignShiftRange({
              employeeId: employeeIdNum,
              shiftId: shiftIdNum,
              startDate: workDate,
              endDate: workDate,
              scheduleSource: 'IMPORT',
              overwrite: true,
            }),
          );
        }
      });
    });
    if (requests.length === 0) {
      this.showAiProposal = false;
      return;
    }
    forkJoin(requests).subscribe({
      next: () => {
        this.shifts = [...this.shifts, ...aiShifts];
        this.showAiProposal = false;
      },
      error: () => {
        window.alert('Unable to apply AI schedule. Please try again.');
        this.showAiProposal = false;
      },
    });
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

  private deriveShiftType(isNightShift: boolean, startTime?: string): Shift['type'] {
    if (isNightShift) return 'night';
    if (!startTime) return 'morning';
    const hour = Number(startTime.split(':')[0]);
    if (Number.isNaN(hour)) return 'morning';
    return hour < 12 ? 'morning' : 'afternoon';
  }

  private getEmployeeName(employeeId: string): string {
    return this.employees.find((e) => e.id === employeeId)?.name || '';
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

