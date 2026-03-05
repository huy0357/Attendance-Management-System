package org.example.ams_be.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ams_be.enums.AttendanceCalcStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceCalculationResult {
    private Long employeeId;
    private LocalDate workDate;

    private Long shiftId;
    private LocalTime scheduledStartTime;
    private LocalTime scheduledEndTime;

    private LocalDateTime actualCheckIn;
    private LocalDateTime actualCheckOut;

    // ✅ dùng status nội bộ
    private AttendanceCalcStatus status;

    private Integer lateMinutes;
    private Integer earlyLeaveMinutes;

    // giữ theo logic hiện tại của bạn
    private Double workingHours;

    private Boolean isNightShift;
    private Boolean hasRequestApplied;
    private String note;
}