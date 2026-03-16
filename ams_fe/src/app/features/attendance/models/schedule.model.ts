export type ScheduleSource = 'MANUAL' | 'IMPORT';

export interface AssignShiftRangeRequest {
  employeeId: number;
  shiftId: number;
  startDate: string;
  endDate: string;
  scheduleSource: ScheduleSource;
  note?: string;
  overwrite: boolean;
}

export interface EmployeeScheduleDayResponse {
  scheduleId: number;
  employeeId: number;
  workDate: string;
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isNightShift: boolean;
  scheduleSource: ScheduleSource;
  note?: string;
}
