/**
 * Model khớp với MonthlyAttendanceEmailDto từ BE.
 * Endpoint trả về từ /api/monthly-summary/*
 */
export interface MonthlySummaryResponse {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  email?: string;
  monthKey: string;        // yyyy-MM

  workDays: number;        // BigDecimal → number
  leaveDays: number;
  absentDays: number;
  lateMinutes: number;
  otMinutes: number;
  earlyLeaveMinutes: number;
}

export interface MonthlySummaryGenerateResponse {
  message: string;
  month: string;
  affectedRows: number;
}
