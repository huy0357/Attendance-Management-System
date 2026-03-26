import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, Observable, Subject, forkJoin, from, of } from 'rxjs';
import { auditTime, catchError, finalize, map, mergeMap, switchMap, takeUntil, toArray } from 'rxjs/operators';
import {
  AttendanceService,
  ScheduleEmployee,
  Shift,
  ShiftTemplate,
} from '../attendance.service';
import { EmployeeScheduleDayResponse } from '../models/schedule.model';

type CacheEntry = {
  items: EmployeeScheduleDayResponse[];
  fetchedAt: number;
};

type LoadResult = {
  key: string;
  shifts: Shift[];
  hadErrors: boolean;
};

type WeekRequestEntry = {
  cacheKey: string;
  request$: Observable<EmployeeScheduleDayResponse[]>;
};

type DepartmentGroupView = {
  departmentName: string;
  employees: ScheduleEmployee[];
  shiftCount: number;
  collapsed: boolean;
};

@Component({
  standalone: false,
  selector: 'app-scheduling',
  templateUrl: './scheduling.component.html',
  styleUrls: ['./scheduling.component.scss'],
})
export class SchedulingComponent implements OnInit, OnDestroy {
  selectedDate: Date = new Date();
  draggedTemplate: ShiftTemplate | null = null;
  dragOver: { day: number; employeeId: string } | null = null;
  isWeekLoading = false;
  errorMessage: string | null = null;
  selectedEmployee: ScheduleEmployee | null = null;
  isDetailOpen = false;
  detailDays: Array<{ date: string; items: EmployeeScheduleDayResponse[] }> = [];
  detailLoading = false;
  detailError: string | null = null;
  searchTerm = '';
  hideEmptyRows = false;
  groupedEmployees: DepartmentGroupView[] = [];

  templates: ShiftTemplate[] = [];
  employees: ScheduleEmployee[] = [];
  shifts: Shift[] = [];
  private weekStart: Date = this.getWeekStart(this.selectedDate);
  private readonly reload$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();
  private readonly dayCache = new Map<string, CacheEntry>();
  private readonly shiftByCell = new Map<string, Shift>();
  private readonly pendingAssignKeys = new Set<string>();
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly weekLoadConcurrency = 8;
  private readonly detailLoadConcurrency = 6;
  private readonly collapsedDepartments = new Set<string>();
  private lastLoadKey: string | null = null;
  private inFlight = false;

  readonly days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  constructor(
    private attendanceService: AttendanceService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.selectedDate = new Date();
    this.weekStart = this.getWeekStart(this.selectedDate);

    forkJoin({
      templates: this.attendanceService.getShiftTemplates(true),
      employees: this.attendanceService.getScheduleEmployees(),
    }).subscribe({
      next: ({ templates, employees }) => {
        this.templates = templates.map((item) => ({
          id: item.shiftId.toString(),
          name: item.shiftName,
          time: `${item.startTime.substring(0, 5)} - ${item.endTime.substring(0, 5)}`,
          type: this.deriveShiftType(item.isNightShift, item.startTime),
          color: this.getColorForType(this.deriveShiftType(item.isNightShift, item.startTime)),
        }));
        this.employees = employees;
        this.recomputeVisibleGroups();
        this.initReloadPipeline();
        this.triggerReload();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        const status = err instanceof HttpErrorResponse ? err.status : 0;
        this.templates = [];
        this.employees = [];
        this.shifts = [];
        this.errorMessage =
          status === 403
            ? 'Không có quyền truy cập (403).'
            : 'Unable to load scheduling data.';
        this.groupedEmployees = [];
        this.shiftByCell.clear();
        this.dayCache.clear();
        this.initReloadPipeline();
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getColorForType(type: Shift['type']): string {
    if (type === 'morning') return 'bg-blue-100 text-blue-700 border-blue-300';
    if (type === 'afternoon') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    if (type === 'night') return 'bg-purple-100 text-purple-700 border-purple-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  }

  goToPreviousWeek(): void {
    const nextWeekStart = this.addDays(this.weekStart, -7);
    if (this.formatDate(nextWeekStart) === this.formatDate(this.weekStart)) {
      return;
    }
    this.weekStart = nextWeekStart;
    this.triggerReload();
  }

  goToNextWeek(): void {
    const nextWeekStart = this.addDays(this.weekStart, 7);
    if (this.formatDate(nextWeekStart) === this.formatDate(this.weekStart)) {
      return;
    }
    this.weekStart = nextWeekStart;
    this.triggerReload();
  }

  goToCurrentWeek(): void {
    const currentWeekStart = this.getStartOfWeek(new Date());
    if (this.formatDate(currentWeekStart) === this.formatDate(this.weekStart)) {
      return;
    }
    this.weekStart = currentWeekStart;
    this.triggerReload();
  }

  handleDragStart(template: ShiftTemplate): void {
    this.draggedTemplate = template;
  }

  handleDragEnd(): void {
    this.draggedTemplate = null;
  }

  onSearchTermChange(term: string): void {
    this.searchTerm = term;
    this.recomputeVisibleGroups();
    this.cdr.markForCheck();
  }

  onHideEmptyRowsChange(hide: boolean): void {
    this.hideEmptyRows = hide;
    this.recomputeVisibleGroups();
    this.cdr.markForCheck();
  }

  toggleDepartmentCollapsed(departmentName: string): void {
    if (this.collapsedDepartments.has(departmentName)) {
      this.collapsedDepartments.delete(departmentName);
    } else {
      this.collapsedDepartments.add(departmentName);
    }
    this.recomputeVisibleGroups();
    this.cdr.markForCheck();
  }

  onDragOver(event: DragEvent, employeeId: string, day: number): void {
    event.preventDefault();
    this.dragOver = { day, employeeId };
  }

  onDragLeave(): void {
    this.dragOver = null;
  }

  openEmployeeDetail(employee: ScheduleEmployee): void {
    const detailEmployee: ScheduleEmployee = {
      ...employee,
    };
    const employeeId = Number(detailEmployee.id);
    const dates = this.getDetailDates();

    this.selectedEmployee = detailEmployee;
    this.isDetailOpen = true;
    this.detailDays = dates.map((date) => ({ date, items: [] as EmployeeScheduleDayResponse[] }));
    this.detailError = null;
    this.detailLoading = Number.isInteger(employeeId) && employeeId > 0;
    this.cdr.markForCheck();

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      this.detailError = 'Invalid employee.';
      this.detailLoading = false;
      return;
    }

    queueMicrotask(() => {
      if (!this.isDetailOpen || !this.selectedEmployee || this.selectedEmployee.id !== detailEmployee.id) {
        return;
      }
      this.loadEmployeeDetail(employeeId, dates);
    });
  }

  closeEmployeeDetail(): void {
    this.isDetailOpen = false;
    this.selectedEmployee = null;
    this.detailDays = [];
    this.detailError = null;
    this.detailLoading = false;
  }

  handleDrop(employeeId: string, day: number): void {
    if (!this.draggedTemplate) return;

    const hasConflict = this.shifts.some((shift) => shift.employeeId === employeeId && shift.day === day);
    if (hasConflict) {
      window.alert('Conflict detected! Employee already has a shift on this day.');
      return;
    }

    const employeeIdNum = Number(employeeId);
    const shiftIdNum = Number(this.draggedTemplate.id);
    if (!Number.isFinite(employeeIdNum) || !Number.isFinite(shiftIdNum)) {
      window.alert('Invalid employee or shift template.');
      return;
    }

    const workDate = this.formatDate(this.addDays(this.weekStart, day));
    const dayKey = this.cacheKey(employeeIdNum, workDate);
    if (this.pendingAssignKeys.has(dayKey)) {
      return;
    }

    const cellKey = this.cellKey(employeeId, day);
    const previousShift = this.shiftByCell.get(cellKey);
    const optimisticShift: Shift = {
      id: previousShift?.id ?? `pending-${employeeId}-${workDate}`,
      employeeId,
      employeeName: this.getEmployeeName(employeeId),
      day,
      startTime: this.draggedTemplate.time.split(' - ')[0],
      endTime: this.draggedTemplate.time.split(' - ')[1],
      type: this.draggedTemplate.type,
      shiftId: shiftIdNum,
      workDate,
      isAiGenerated: false,
    };

    this.pendingAssignKeys.add(dayKey);
    this.upsertShiftForCell(optimisticShift);
    this.errorMessage = null;
    this.draggedTemplate = null;
    this.dragOver = null;
    this.cdr.markForCheck();

    this.attendanceService.assignShiftRange({
      employeeId: employeeIdNum,
      shiftId: shiftIdNum,
      startDate: workDate,
      endDate: workDate,
      scheduleSource: 'MANUAL',
      overwrite: true,
    }).subscribe({
      next: () => {
        this.refreshOneDay(employeeIdNum, workDate, day);
      },
      error: () => {
        this.pendingAssignKeys.delete(dayKey);
        if (previousShift) {
          this.upsertShiftForCell(previousShift);
        } else {
          this.removeShiftForCell(employeeId, day);
        }
        this.errorMessage = 'Unable to assign shift. Please try again.';
        this.cdr.markForCheck();
      },
    });
  }

  getShift(employeeId: string, dayIndex: number): Shift | undefined {
    return this.shiftByCell.get(this.cellKey(employeeId, dayIndex));
  }

  isDragOver(employeeId: string, dayIndex: number): boolean {
    return this.dragOver?.day === dayIndex && this.dragOver?.employeeId === employeeId;
  }

  getCoveragePercent(): string {
    const totalSlots = this.employees.length * this.days.length;
    if (totalSlots <= 0) {
      return '0%';
    }
    const assignedSlots = this.getAssignedCellCount();
    const percent = (assignedSlots / totalSlots) * 100;
    return `${this.clampPercent(percent)}%`;
  }

  getAssignedCellCount(): number {
    return this.shiftByCell.size;
  }

  getImportedAssignmentCount(): number {
    return this.shifts.filter((shift) => shift.isAiGenerated).length;
  }

  getTemplateColor(type: Shift['type']): string {
    const template = this.templates.find((t) => t.type === type);
    return template ? template.color : '';
  }

  trackByDepartment(_index: number, group: DepartmentGroupView): string {
    return group.departmentName;
  }

  trackByEmployee(_index: number, employee: ScheduleEmployee): string {
    return employee.id;
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

  private initReloadPipeline(): void {
    this.reload$
      .pipe(
        auditTime(0),
        switchMap(() => this.loadWeek$()),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.shifts = result.shifts;
          this.lastLoadKey = result.key;
          if (result.hadErrors) {
            this.errorMessage = 'Some schedules could not be loaded.';
          }
          this.rebuildShiftByCell();
          this.recomputeVisibleGroups();
          this.cdr.markForCheck();
        },
      });
  }

  private triggerReload(): void {
    this.reload$.next();
  }

  private loadWeek$(): Observable<LoadResult> {
    if (this.inFlight) {
      return EMPTY;
    }

    const key = this.buildLoadKey();
    const employeeIds = this.employees
      .map((employee) => Number(employee.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (employeeIds.length === 0) {
      this.lastLoadKey = key;
      this.shifts = [];
      this.shiftByCell.clear();
      this.cdr.markForCheck();
      return EMPTY;
    }

    const weekDates = this.days.map((_, dayIndex) => this.toYmd(this.addDays(this.weekStart, dayIndex)));
    const requestEntries = employeeIds.flatMap((employeeId) =>
      weekDates.map((ymd) => ({
        cacheKey: this.cacheKey(employeeId, ymd),
        request$: this.attendanceService.getScheduleByEmployeeDay(employeeId, ymd),
      })),
    );

    const staleEntries = requestEntries.filter((entry) => !this.isCacheFresh(entry.cacheKey));
    if (staleEntries.length === 0) {
      if (this.lastLoadKey === key) {
        return EMPTY;
      }
      return of({ key, shifts: this.mapCacheToShifts(this.collectWeekCache(requestEntries)), hadErrors: false });
    }

    this.inFlight = true;
    this.isWeekLoading = true;
    this.errorMessage = null;

    return from(staleEntries)
      .pipe(
        mergeMap(
          (entry) =>
            entry.request$.pipe(
              map((items) => ({ cacheKey: entry.cacheKey, items, failed: false })),
              catchError(() => of({ cacheKey: entry.cacheKey, items: [] as EmployeeScheduleDayResponse[], failed: true })),
            ),
          this.weekLoadConcurrency,
        ),
        toArray(),
        map((responses) => {
          const now = Date.now();
          let hadErrors = false;

          responses.forEach((response) => {
            if (response.failed) {
              hadErrors = true;
              return;
            }
            this.dayCache.set(response.cacheKey, { items: response.items, fetchedAt: now });
          });

          const shifts = this.mapCacheToShifts(this.collectWeekCache(requestEntries));
          return { key, shifts, hadErrors };
        }),
        finalize(() => {
          this.inFlight = false;
          this.isWeekLoading = false;
          this.cdr.markForCheck();
        }),
      );
  }

  private buildLoadKey(): string {
    const week = this.toYmd(this.weekStart);
    const ids = this.employees.map((employee) => employee.id).join(',');
    return `week|${week}|${ids}`;
  }

  private toYmd(date: Date): string {
    return this.formatDate(date);
  }

  private mapCacheToShifts(cache: Map<string, EmployeeScheduleDayResponse[]>): Shift[] {
    const items = Array.from(cache.values()).flatMap((value) => value);
    return items
      .map((item) => this.mapDayItemToShift(item))
      .filter((item): item is Shift => item !== null);
  }

  private mapDayItemToShift(item: EmployeeScheduleDayResponse): Shift | null {
    const day = this.diffDays(this.weekStart, item.workDate);
    if (day < 0 || day > 6) {
      return null;
    }
    return {
      id: String(item.scheduleId),
      employeeId: String(item.employeeId),
      employeeName: this.getEmployeeName(String(item.employeeId)),
      day,
      startTime: item.startTime ? item.startTime.substring(0, 5) : '',
      endTime: item.endTime ? item.endTime.substring(0, 5) : '',
      type: this.deriveShiftType(item.isNightShift, item.startTime),
      shiftId: item.shiftId,
      workDate: item.workDate,
      isAiGenerated: item.scheduleSource === 'IMPORT',
    };
  }

  private rebuildShiftByCell(): void {
    this.shiftByCell.clear();
    this.shifts.forEach((shift) => {
      const key = this.cellKey(shift.employeeId, shift.day);
      if (!this.shiftByCell.has(key)) {
        this.shiftByCell.set(key, shift);
      }
    });
  }

  private syncShiftsFromCellMap(): void {
    this.shifts = Array.from(this.shiftByCell.values());
  }

  private upsertShiftForCell(shift: Shift): void {
    this.shiftByCell.set(this.cellKey(shift.employeeId, shift.day), shift);
    this.syncShiftsFromCellMap();
    this.recomputeVisibleGroups();
  }

  private removeShiftForCell(employeeId: string, day: number): void {
    this.shiftByCell.delete(this.cellKey(employeeId, day));
    this.syncShiftsFromCellMap();
    this.recomputeVisibleGroups();
  }

  private refreshOneDay(employeeId: number, ymd: string, day: number): void {
    const cacheKey = this.cacheKey(employeeId, ymd);
    this.invalidateCache(employeeId, ymd);
    this.attendanceService.getScheduleByEmployeeDay(employeeId, ymd).subscribe({
      next: (items) => {
        this.pendingAssignKeys.delete(cacheKey);
        this.dayCache.set(cacheKey, { items, fetchedAt: Date.now() });
        const employeeIdStr = String(employeeId);
        const mapped = items
          .map((item) => this.mapDayItemToShift(item))
          .filter((item): item is Shift => item !== null)
          .find((item) => item.employeeId === employeeIdStr && item.day === day);

        if (mapped) {
          this.upsertShiftForCell(mapped);
        } else {
          this.removeShiftForCell(employeeIdStr, day);
        }
        this.syncDetailForEmployeeDay(employeeId, ymd);
        this.cdr.markForCheck();
      },
      error: () => {
        this.pendingAssignKeys.delete(cacheKey);
        this.errorMessage = 'Assigned but unable to refresh schedule from server.';
        this.cdr.markForCheck();
      },
    });
  }

  private collectWeekCache(entries: WeekRequestEntry[]): Map<string, EmployeeScheduleDayResponse[]> {
    const cache = new Map<string, EmployeeScheduleDayResponse[]>();
    entries.forEach((entry) => {
      cache.set(entry.cacheKey, this.dayCache.get(entry.cacheKey)?.items ?? []);
    });
    return cache;
  }

  private isCacheFresh(cacheKey: string): boolean {
    const cache = this.dayCache.get(cacheKey);
    if (!cache) {
      return false;
    }
    return Date.now() - cache.fetchedAt < this.cacheTtlMs;
  }

  private invalidateCache(employeeId: number, ymd: string): void {
    this.dayCache.delete(this.cacheKey(employeeId, ymd));
  }

  private cacheKey(employeeId: number, ymd: string): string {
    return `${employeeId}|${ymd}`;
  }

  private clampPercent(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(100, value));
  }

  private getDetailDates(): string[] {
    return this.days.map((_, dayIndex) => this.toYmd(this.addDays(this.weekStart, dayIndex)));
  }

  private loadEmployeeDetail(employeeId: number, dates: string[]): void {
    this.hydrateDetailDaysFromCache(employeeId, dates);

    const missingDates = dates.filter((ymd) => !this.dayCache.has(this.cacheKey(employeeId, ymd)));
    if (missingDates.length === 0) {
      this.detailLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.detailLoading = true;
    from(missingDates)
      .pipe(
        mergeMap(
          (ymd) =>
            this.attendanceService.getScheduleByEmployeeDay(employeeId, ymd).pipe(
              map((items) => ({ ymd, items, failed: false })),
              catchError(() => of({ ymd, items: [] as EmployeeScheduleDayResponse[], failed: true })),
            ),
          this.detailLoadConcurrency,
        ),
        toArray(),
        finalize(() => {
          this.detailLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((responses) => {
        if (!this.selectedEmployee || Number(this.selectedEmployee.id) !== employeeId) {
          return;
        }
        const now = Date.now();
        const hasError = responses.some((response) => response.failed);
        responses.forEach((response) => {
          if (!response.failed) {
            this.dayCache.set(this.cacheKey(employeeId, response.ymd), { items: response.items, fetchedAt: now });
          }
        });
        if (hasError) {
          this.detailError = 'Some days could not be loaded.';
        }
        this.hydrateDetailDaysFromCache(employeeId, dates);
      });
  }

  private hydrateDetailDaysFromCache(employeeId: number, dates: string[]): void {
    this.detailDays = dates.map((date) => ({
      date,
      items: this.dayCache.get(this.cacheKey(employeeId, date))?.items ?? [],
    }));
  }

  private syncDetailForEmployeeDay(employeeId: number, ymd: string): void {
    if (!this.isDetailOpen || !this.selectedEmployee || Number(this.selectedEmployee.id) !== employeeId) {
      return;
    }
    this.detailDays = this.detailDays.map((entry) =>
      entry.date === ymd
        ? { date: ymd, items: this.dayCache.get(this.cacheKey(employeeId, ymd))?.items ?? [] }
        : entry,
    );
  }

  private recomputeVisibleGroups(): void {
    const normalizedQuery = this.searchTerm.trim().toLowerCase();
    const weekShifts = Array.from(this.shiftByCell.values()).filter((shift) => this.isShiftInCurrentWeek(shift));
    const assignedEmployeeIds = new Set(weekShifts.map((shift) => shift.employeeId));
    const visibleEmployees = this.employees.filter((employee) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        employee.name.toLowerCase().includes(normalizedQuery) ||
        (employee.employeeCode ?? '').toLowerCase().includes(normalizedQuery);

      if (!matchesSearch) {
        return false;
      }
      if (!this.hideEmptyRows) {
        return true;
      }
      return assignedEmployeeIds.has(employee.id);
    });

    const groupMap = new Map<string, DepartmentGroupView>();
    visibleEmployees.forEach((employee) => {
      const departmentName = employee.department?.trim() || 'Unassigned';
      const group = groupMap.get(departmentName) ?? {
        departmentName,
        employees: [],
        shiftCount: 0,
        collapsed: this.collapsedDepartments.has(departmentName),
      };
      group.employees.push(employee);
      groupMap.set(departmentName, group);
    });

    const departmentByEmployeeId = new Map<string, string>();
    visibleEmployees.forEach((employee) => {
      departmentByEmployeeId.set(employee.id, employee.department?.trim() || 'Unassigned');
    });

    weekShifts.forEach((shift) => {
      const departmentName = departmentByEmployeeId.get(shift.employeeId);
      if (!departmentName) {
        return;
      }
      const group = groupMap.get(departmentName);
      if (group) {
        group.shiftCount += 1;
      }
    });

    this.groupedEmployees = Array.from(groupMap.values()).map((group) => ({
      ...group,
      collapsed: this.collapsedDepartments.has(group.departmentName),
    }));
  }

  private isShiftInCurrentWeek(shift: Shift): boolean {
    if (shift.workDate) {
      const shiftDate = new Date(`${shift.workDate}T00:00:00`);
      if (!Number.isNaN(shiftDate.getTime())) {
        const weekStart = new Date(this.weekStart);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = this.addDays(weekStart, this.days.length - 1);
        weekEnd.setHours(23, 59, 59, 999);
        return shiftDate >= weekStart && shiftDate <= weekEnd;
      }
    }
    return shift.day >= 0 && shift.day < this.days.length;
  }

  private cellKey(employeeId: string, dayIndex: number): string {
    return `${employeeId}|${dayIndex}`;
  }

  private getWeekStart(date: Date): Date {
    return this.getStartOfWeek(date);
  }

  private getStartOfWeek(date: Date): Date {
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

  private diffDays(startDate: Date, ymd: string): number {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const current = new Date(`${ymd}T00:00:00`);
    return Math.round((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
}
