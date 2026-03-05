package org.example.ams_be.service.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ams_be.dto.AttendanceCalculationResult;
import org.example.ams_be.dto.EmployeeLogSummary;
import org.example.ams_be.entity.AttendanceDaily;
import org.example.ams_be.entity.EmployeeSchedule;
import org.example.ams_be.enums.AttendanceCalcStatus;
import org.example.ams_be.repository.AttendanceDailyRepository;
import org.example.ams_be.repository.EmployeeScheduleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceBatchService {

    private final EmployeeScheduleRepository employeeScheduleRepository;
    private final AttendanceDailyRepository attendanceDailyRepository;

    private final LogCleaningService logCleaningService;
    private final AttendanceCalculationService attendanceCalculationService;
    private final RequestApplicationService requestApplicationService;

    @Transactional
    public void processAttendanceForDate(LocalDate processDate) {
        log.info("Starting attendance batch processing for date: {}", processDate);

        // 1) Fetch + clean logs (face_events)
        List<EmployeeLogSummary> cleanedLogs = logCleaningService.fetchAndCleanLogs(processDate);
        log.info("DEBUG cleanedLogs size={}", cleanedLogs.size());
        cleanedLogs.forEach(s -> log.info("DEBUG emp={} entries={}", s.getEmployeeId(),
                s.getLogEntries() == null ? 0 : s.getLogEntries().size()));

        // 2) Fetch schedules by date
        Map<Long, EmployeeSchedule> employeeSchedules = employeeScheduleRepository.findByWorkDate(processDate)
                .stream()
                .collect(Collectors.toMap(
                        EmployeeSchedule::getEmployeeId,
                        s -> s,
                        (a, b) -> b
                ));
        log.info("Fetched {} employee schedules for date: {}", employeeSchedules.size(), processDate);

        // 3) Calculate attendance
        List<AttendanceCalculationResult> calculationResults =
                attendanceCalculationService.calculateAttendance(cleanedLogs, employeeSchedules, processDate);
        log.info("Calculated attendance for {} employees", calculationResults.size());

        // 4) Apply requests
        List<AttendanceCalculationResult> finalResults =
                requestApplicationService.applyRequests(calculationResults, processDate);
        log.info("Applied requests for {} employees", finalResults.size());

        // 5) Upsert attendance_daily
        upsertAttendanceDaily(finalResults);
        log.info("Upserted {} attendance_daily records for date: {}", finalResults.size(), processDate);

        // 6) face_events không có processed flag => skip mark processed
        log.info("Completed attendance batch processing for date: {}", processDate);
    }

    private void upsertAttendanceDaily(List<AttendanceCalculationResult> results) {
        List<AttendanceDaily> entities = results.stream()
                .map(this::toEntity)
                .map(e -> {
                    // upsert theo employeeId + workDate
                    attendanceDailyRepository.findByEmployeeIdAndWorkDate(e.getEmployeeId(), e.getWorkDate())
                            .ifPresent(existing -> e.setAttendanceId(existing.getAttendanceId()));
                    return e;
                })
                .collect(Collectors.toList());

        attendanceDailyRepository.saveAll(entities);
    }

    private AttendanceDaily toEntity(AttendanceCalculationResult r) {
        int workMinutes = (int) Math.round(Optional.ofNullable(r.getWorkingHours()).orElse(0.0) * 60.0);

        return AttendanceDaily.builder()
                .employeeId(r.getEmployeeId())
                .workDate(r.getWorkDate())
                .shiftId(r.getShiftId())

                // DB schema
                .firstInTime(r.getActualCheckIn())
                .lastOutTime(r.getActualCheckOut())
                .workMinutes(workMinutes)
                .lateMinutes(Optional.ofNullable(r.getLateMinutes()).orElse(0))
                .earlyLeaveMinutes(Optional.ofNullable(r.getEarlyLeaveMinutes()).orElse(0))

                // các field DB khác nếu chưa tính thì set default
                .breakMinutes(0)
                .otMinutesBefore(0)
                .otMinutesAfter(0)
                .otMinutesHoliday(0)

                .status(toDbStatus(r.getStatus()))
                .calculatedAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Map status tính toán (nội bộ) -> status DB (PRESENT/ABSENT/LEAVE)
     */
    private AttendanceDaily.AttendanceStatus toDbStatus(AttendanceCalcStatus s) {
        if (s == null) return AttendanceDaily.AttendanceStatus.ABSENT;

        return switch (s) {
            case ON_LEAVE -> AttendanceDaily.AttendanceStatus.LEAVE;
            case ABSENT, MISSING_LOG -> AttendanceDaily.AttendanceStatus.ABSENT;
            case PRESENT, LATE, EARLY_LEAVE -> AttendanceDaily.AttendanceStatus.PRESENT;
        };
    }
}