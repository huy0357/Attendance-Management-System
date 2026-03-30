/** Mirrors BE: DashboardKpiResponse.java */
export interface DashboardKpiResponse {
  totalEmployees: TotalEmployeesKpi;
  presentToday: PresentTodayKpi;
  lateCheckins: LateCheckinsKpi;
  exceptions: ExceptionsKpi;
  generatedAt: string;
}

export interface TotalEmployeesKpi {
  count: number;
  newThisMonth: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface PresentTodayKpi {
  count: number;
  total: number;
  percentage: number;
  lastUpdated: string;
}

export interface LateCheckinsKpi {
  count: number;
  changeFromYesterday: number;
  averageDelayMinutes: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface ExceptionsKpi {
  count: number;
  breakdown: Record<string, number>; // ExceptionSeverity -> count
}

/** Mirrors BE: LivePulseResponse.java */
export interface LivePulseResponse {
  records: LivePulseRecord[];
  hasMore: boolean;
  lastTimestamp: string;
  totalCount: number;
  realTimeEnabled: boolean;
}

export interface LivePulseRecord {
  id: number;
  employee: LivePulseEmployeeInfo;
  checkInTime: string;
  checkOutTime: string | null;
  location: string;
  branchId: string;
  status: string; // AttendanceStatus enum
  lateMinutes: number;
  kioskId: string;
  faceConfidence: number;
}

export interface LivePulseEmployeeInfo {
  id: number;
  name: string;
  employeeCode: string;
  avatar: string | null;
  department: string;
}

/** Mirrors BE: ExceptionsResponse.java */
export interface ExceptionsResponse {
  exceptions: ExceptionRecord[];
  pagination: ExceptionPaginationInfo;
}

export interface ExceptionRecord {
  id: number;
  employee: ExceptionEmployeeInfo;
  exceptionType: string; // ExceptionType enum
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'RESOLVED' | 'IN_PROGRESS';
  occurrenceTime: string;
  branchId: string;
  assignedTo: string | null;
  resolvedTime: string | null;
  resolvedBy: string | null;
  notes: string | null;
  estimatedResolutionTime: string | null;
}

export interface ExceptionEmployeeInfo {
  id: number;
  name: string;
  employeeCode: string;
  avatar: string | null;
  department: string;
}

export interface ExceptionPaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** Mirrors BE Spring Data: Page<AttendanceDailyResponse> */
export interface AttendanceDailyPage {
  content: AttendanceDailyRecord[];
  totalPages: number;
  totalElements: number;
  number: number;   // current page (0-indexed)
  size: number;
}

export interface AttendanceDailyRecord {
  attendanceId: number;
  employeeId: number;
  workDate: string;
  shiftId: number;
  firstInTime: string | null;
  lastOutTime: string | null;
  workMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  breakMinutes: number;
  otMinutesBefore: number;
  otMinutesAfter: number;
  otMinutesHoliday: number;
  status: string;
  calculatedAt: string;
  updatedAt: string;
}
