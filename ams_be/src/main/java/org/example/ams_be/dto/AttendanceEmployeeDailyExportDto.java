package org.example.ams_be.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceEmployeeDailyExportDto {
    private Long employeeId;
    private String employeeCode;
    private String fullName;
    private String email;

    private LocalDate workDate;
    private Long shiftId;
    private LocalDateTime firstInTime;
    private LocalDateTime lastOutTime;

    private Integer workMinutes;
    private Integer lateMinutes;
    private Integer earlyLeaveMinutes;
    private Integer breakMinutes;
    private Integer otMinutesBefore;
    private Integer otMinutesAfter;
    private Integer otMinutesHoliday;
    private String status;
}