package org.example.ams_be.dto.response;

import lombok.Builder;
import lombok.Data;
import org.example.ams_be.entity.AttendanceDaily;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class AttendanceDailyResponse {

    private Long attendanceId;
    private Long employeeId;
    private LocalDate workDate;
    private Long shiftId;

    // DB columns
    private LocalDateTime firstInTime;
    private LocalDateTime lastOutTime;

    private Integer workMinutes;
    private Integer lateMinutes;
    private Integer earlyLeaveMinutes;

    private Integer breakMinutes;
    private Integer otMinutesBefore;
    private Integer otMinutesAfter;
    private Integer otMinutesHoliday;

    private AttendanceDaily.AttendanceStatus status;

    private LocalDateTime calculatedAt;
    private LocalDateTime updatedAt;
}