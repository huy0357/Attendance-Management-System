package org.example.ams_be.service.batch;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.HashMap;
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

    private final ObjectMapper objectMapper;

    @Transactional
    public void processAttendanceForDate(LocalDate processDate) {
        log.info("Starting attendance batch processing for date: {}", processDate);

        // FIX RERUN: Reset trạng thái event cũ của ngày này để đảm bảo Idempotency
        logCleaningService.resetConsumedEventsForDate(processDate);

        Map<Long, EmployeeSchedule> employeeSchedules = employeeScheduleRepository.findByWorkDate(processDate)
                .stream()
                .collect(Collectors.toMap(EmployeeSchedule::getEmployeeId, s -> s, (a, b) -> b));

        List<EmployeeLogSummary> cleanedLogs = logCleaningService.fetchAndCleanLogs(processDate, employeeSchedules);

        List<AttendanceCalculationResult> calculationResults =
                attendanceCalculationService.calculateAttendance(cleanedLogs, employeeSchedules, processDate);

        List<AttendanceCalculationResult> finalResults =
                requestApplicationService.applyRequests(calculationResults, processDate);

        upsertAttendanceDaily(finalResults);
        logCleaningService.markEventsConsumed(finalResults, processDate);

        log.info("Completed attendance batch processing for date: {}", processDate);
    }

    private void upsertAttendanceDaily(List<AttendanceCalculationResult> results) {
        List<AttendanceDaily> entities = results.stream()
                .map(this::toEntity)
                .map(e -> {
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

                .firstInTime(r.getActualCheckIn())
                .lastOutTime(r.getActualCheckOut())
                .workMinutes(workMinutes)
                .lateMinutes(Optional.ofNullable(r.getLateMinutes()).orElse(0))
                .earlyLeaveMinutes(Optional.ofNullable(r.getEarlyLeaveMinutes()).orElse(0))

                .breakMinutes(Optional.ofNullable(r.getBreakMinutesApplied()).orElse(0))
                .otMinutesBefore(Optional.ofNullable(r.getOtMinutesBefore()).orElse(0))
                .otMinutesAfter(Optional.ofNullable(r.getOtMinutesAfter()).orElse(0))
                .otMinutesHoliday(Optional.ofNullable(r.getOtMinutesHoliday()).orElse(0))

                .status(toDbStatus(r.getStatus()))
                .calculatedAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .inputsSnapshotJson(buildSnapshotJson(r))
                .build();
    }

    private String buildSnapshotJson(AttendanceCalculationResult r) {
        try {
            Map<String, Object> snapshot = new HashMap<>();
            snapshot.put("note", r.getNote());
            snapshot.put("status", r.getStatus());
            snapshot.put("consumedEventIds", r.getConsumedEventIds());
            snapshot.put("hasRequestApplied", r.isRequestApplied());
            return objectMapper.writeValueAsString(snapshot);
        } catch (Exception ex) {
            log.warn("Failed to build inputs_snapshot_json for employee={}, date={}: {}",
                    r.getEmployeeId(), r.getWorkDate(), ex.getMessage());
            return null;
        }
    }

    /**
     * Map status tính toán (nội bộ) -> status DB (PRESENT/ABSENT/LEAVE)
     */
    private AttendanceDaily.AttendanceStatus toDbStatus(AttendanceCalcStatus s) {
        if (s == null) return AttendanceDaily.AttendanceStatus.ABSENT;

        return switch (s) {
            case ON_LEAVE -> AttendanceDaily.AttendanceStatus.LEAVE;
            case ABSENT, MISSING_LOG, MISSING_SCHEDULE -> AttendanceDaily.AttendanceStatus.ABSENT;
            case PRESENT, LATE, EARLY_LEAVE -> AttendanceDaily.AttendanceStatus.PRESENT;
        };
    }
}