package org.example.ams_be.service.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ams_be.dto.AttendanceCalculationResult;
import org.example.ams_be.dto.EmployeeLogSummary;
import org.example.ams_be.entity.EmployeeSchedule;
import org.example.ams_be.entity.ShiftTemplate;
import org.example.ams_be.enums.AttendanceCalcStatus;
import org.example.ams_be.repository.ShiftTemplateRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceCalculationService {

    private final ShiftTemplateRepository shiftTemplateRepository;

    public List<AttendanceCalculationResult> calculateAttendance(
            List<EmployeeLogSummary> logSummaries,
            Map<Long, EmployeeSchedule> schedules,
            LocalDate processDate
    ) {
        Map<Long, EmployeeLogSummary> logMap = logSummaries.stream()
                .collect(Collectors.toMap(
                        EmployeeLogSummary::getEmployeeId,
                        l -> l,
                        (a, b) -> a
                ));

        return schedules.entrySet().stream()
                .map(entry -> {
                    Long employeeId = entry.getKey();
                    EmployeeSchedule schedule = entry.getValue();

                    EmployeeLogSummary logs = logMap.getOrDefault(
                            employeeId,
                            EmployeeLogSummary.builder()
                                    .employeeId(employeeId)
                                    .logEntries(Collections.emptyList())
                                    .build()
                    );

                    return calculateForEmployee(logs, schedule, processDate);
                })
                .collect(Collectors.toList());
    }

    private AttendanceCalculationResult calculateForEmployee(
            EmployeeLogSummary logSummary,
            EmployeeSchedule schedule,
            LocalDate processDate
    ) {
        AttendanceCalculationResult.AttendanceCalculationResultBuilder builder =
                AttendanceCalculationResult.builder()
                        .employeeId(logSummary.getEmployeeId())
                        .workDate(processDate)
                        .hasRequestApplied(false);

        // Không có schedule => ABSENT
        if (schedule == null) {
            return builder
                    .status(AttendanceCalcStatus.ABSENT)
                    .note("No schedule found")
                    .lateMinutes(0)
                    .earlyLeaveMinutes(0)
                    .workingHours(0.0)
                    .isNightShift(false)
                    .build();
        }

        Optional<ShiftTemplate> shiftOpt = shiftTemplateRepository.findById(schedule.getShiftId());
        if (shiftOpt.isEmpty()) {
            return builder
                    .status(AttendanceCalcStatus.ABSENT)
                    .note("Shift template not found")
                    .lateMinutes(0)
                    .earlyLeaveMinutes(0)
                    .workingHours(0.0)
                    .isNightShift(false)
                    .build();
        }

        ShiftTemplate shift = shiftOpt.get();

        builder.shiftId(shift.getShiftId())
                .scheduledStartTime(shift.getStartTime())
                .scheduledEndTime(shift.getEndTime())
                .isNightShift(Boolean.TRUE.equals(shift.getIsNightShift()));

        // Không có log => MISSING_LOG (vẫn tính là vi phạm để batch xử lý)
        if (logSummary.getLogEntries() == null || logSummary.getLogEntries().isEmpty()) {
            return builder
                    .status(AttendanceCalcStatus.MISSING_LOG)
                    .note("No log entries found")
                    .lateMinutes(0)
                    .earlyLeaveMinutes(0)
                    .workingHours(0.0)
                    .build();
        }

        LocalDateTime checkIn = findFirst(logSummary.getLogEntries(), "IN");
        LocalDateTime checkOut = findLast(logSummary.getLogEntries(), "OUT");

        builder.actualCheckIn(checkIn)
                .actualCheckOut(checkOut);

        return calculateWorkingTime(builder, shift, checkIn, checkOut, processDate);
    }

    private LocalDateTime findFirst(List<EmployeeLogSummary.LogEntry> entries, String type) {
        return entries.stream()
                .filter(e -> type.equalsIgnoreCase(e.getEventType()))
                .map(EmployeeLogSummary.LogEntry::getTimestamp)
                .min(LocalDateTime::compareTo)
                .orElse(null);
    }

    private LocalDateTime findLast(List<EmployeeLogSummary.LogEntry> entries, String type) {
        return entries.stream()
                .filter(e -> type.equalsIgnoreCase(e.getEventType()))
                .map(EmployeeLogSummary.LogEntry::getTimestamp)
                .max(LocalDateTime::compareTo)
                .orElse(null);
    }

    private AttendanceCalculationResult calculateWorkingTime(
            AttendanceCalculationResult.AttendanceCalculationResultBuilder builder,
            ShiftTemplate shift,
            LocalDateTime checkIn,
            LocalDateTime checkOut,
            LocalDate workDate
    ) {
        LocalDateTime scheduledStart = workDate.atTime(shift.getStartTime());
        LocalDateTime scheduledEnd = workDate.atTime(shift.getEndTime());

        // Night shift: endTime < startTime => qua ngày hôm sau
        if (Boolean.TRUE.equals(shift.getIsNightShift())
                && shift.getEndTime().isBefore(shift.getStartTime())) {
            scheduledEnd = scheduledEnd.plusDays(1);
        }

        int lateMinutes = 0;
        int earlyLeaveMinutes = 0;
        double workingHours = 0.0;

        AttendanceCalcStatus status = AttendanceCalcStatus.PRESENT;
        StringBuilder note = new StringBuilder();

        // Không có cả IN và OUT
        if (checkIn == null && checkOut == null) {
            return builder
                    .status(AttendanceCalcStatus.ABSENT)
                    .note("Absent - no logs found")
                    .lateMinutes(0)
                    .earlyLeaveMinutes(0)
                    .workingHours(0.0)
                    .build();
        }

        // Thiếu 1 trong 2
        if (checkIn == null || checkOut == null) {
            return builder
                    .status(AttendanceCalcStatus.MISSING_LOG)
                    .note(checkIn == null ? "Missing check-in" : "Missing check-out")
                    .lateMinutes(0)
                    .earlyLeaveMinutes(0)
                    .workingHours(0.0)
                    .build();
        }

        // Late
        if (checkIn.isAfter(scheduledStart)) {
            lateMinutes = (int) Duration.between(scheduledStart, checkIn).toMinutes();
            status = AttendanceCalcStatus.LATE;
            note.append("Late ").append(lateMinutes).append(" minutes. ");
        }

        // Early leave
        if (checkOut.isBefore(scheduledEnd)) {
            earlyLeaveMinutes = (int) Duration.between(checkOut, scheduledEnd).toMinutes();

            if (status == AttendanceCalcStatus.PRESENT) {
                status = AttendanceCalcStatus.EARLY_LEAVE;
            }

            note.append("Early leave ").append(earlyLeaveMinutes).append(" minutes. ");
        }

        long totalMinutes = Duration.between(checkIn, checkOut).toMinutes();
        long breakMinutes = shift.getBreakMinutes() == null ? 0 : shift.getBreakMinutes();
        long actualWorkingMinutes = Math.max(0, totalMinutes - breakMinutes);

        workingHours = actualWorkingMinutes / 60.0;

        return builder
                .status(status)
                .lateMinutes(lateMinutes)
                .earlyLeaveMinutes(earlyLeaveMinutes)
                .workingHours(workingHours)
                .note(note.toString().trim())
                .build();
    }
}