package org.example.ams_be.dto;

import lombok.*;
import org.example.ams_be.enums.AttendanceCalcStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceCalculationResult {

    private Long employeeId;
    private LocalDate workDate;
    private Long shiftId;

    private LocalTime scheduledStartTime;
    private LocalTime scheduledEndTime;
    private Boolean isNightShift;   

    private LocalDateTime actualCheckIn;
    private LocalDateTime actualCheckOut;

    private AttendanceCalcStatus status;
    private String note;

    private Integer lateMinutes;
    private Integer earlyLeaveMinutes;
    private Double workingHours;

    private Integer breakMinutesApplied;
    private Integer otMinutesBefore;
    private Integer otMinutesAfter;
    private Integer otMinutesHoliday;
    private List<Long> consumedEventIds;
    private boolean requestApplied; // Boolean (wrapper) -> getter là getHasRequestApplied()
}