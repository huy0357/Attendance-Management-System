export interface AttendanceDailyResponse {
  attendanceId: number;
  employeeId: number;
  workDate: string;
  shiftId: number | null;
  firstInTime: string | null;
  lastOutTime: string | null;
  workMinutes: number | null;
  lateMinutes: number | null;
  earlyLeaveMinutes: number | null;
  breakMinutes: number | null;
  otMinutesBefore: number | null;
  otMinutesAfter: number | null;
  otMinutesHoliday: number | null;
  status: string | null;
  calculatedAt: string | null;
  updatedAt: string | null;
}
