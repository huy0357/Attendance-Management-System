package org.example.ams_be.enums;

/**
 * Trạng thái tính toán nội bộ (không phụ thuộc schema DB).
 * DB attendance_daily.status chỉ có: PRESENT/ABSENT/LEAVE.
 */
public enum AttendanceCalcStatus {
    PRESENT,
    ABSENT,
    LATE,
    EARLY_LEAVE,
    MISSING_LOG,
    MISSING_SCHEDULE, // MỚI: có chấm công nhưng chưa được xếp ca
    ON_LEAVE
}