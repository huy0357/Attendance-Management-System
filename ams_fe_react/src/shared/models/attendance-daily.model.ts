/**
 * Model khớp với dữ liệu trả về từ BE AttendanceDailyController
 * Endpoints: /api/attendance-daily/me | /admin | /employee/{id}
 */
export interface AttendanceDailyResponse {
  attendanceId: number;
  employeeId: number;
  workDate: string;           // yyyy-MM-dd
  shiftId?: number;

  // Thời gian thực tế
  firstInTime?: string;       // ISO datetime, VD: 2026-08-05T08:02:00
  lastOutTime?: string;       // ISO datetime

  // Kết quả tính công
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY' | 'NO_SCHEDULE' | string;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  workMinutes?: number;       // Tổng số phút làm việc thực tế

  // Tăng ca (OT)
  otMinutesBefore?: number;
  otMinutesAfter?: number;
  otMinutesHoliday?: number;

  note?: string;
  requestApplied?: boolean;
}
