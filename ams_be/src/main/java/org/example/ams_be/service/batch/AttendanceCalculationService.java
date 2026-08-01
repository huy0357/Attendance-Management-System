package org.example.ams_be.service.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ams_be.config.AttendanceProperties;
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
    private final AttendanceProperties attendanceProperties;

    public List<AttendanceCalculationResult> calculateAttendance(
            List<EmployeeLogSummary> logSummaries,
            Map<Long, EmployeeSchedule> schedules,
            LocalDate processDate
    ) {
        Map<Long, EmployeeLogSummary> logMap = logSummaries.stream()
                .collect(Collectors.toMap(EmployeeLogSummary::getEmployeeId, l -> l, (a, b) -> a));

        Set<Long> allEmployeeIds = new HashSet<>();
        allEmployeeIds.addAll(schedules.keySet());
        allEmployeeIds.addAll(logMap.keySet());

        List<AttendanceCalculationResult> results = new ArrayList<>();
        for (Long employeeId : allEmployeeIds) {
            EmployeeSchedule schedule = schedules.get(employeeId);
            EmployeeLogSummary logs = logMap.get(employeeId);
            boolean hasLogs = logs != null && logs.getLogEntries() != null && !logs.getLogEntries().isEmpty();

            // Không có ca, không có chấm công -> không có gì để ghi nhận, bỏ qua
            if (schedule == null && !hasLogs) {
                continue;
            }
            if (logs == null) {
                logs = EmployeeLogSummary.builder()
                        .employeeId(employeeId)
                        .logEntries(Collections.emptyList())
                        .build();
            }
            results.add(calculateForEmployee(logs, schedule, processDate));
        }
        return results;
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
                .requestApplied(false); 

        // Có chấm công nhưng KHÔNG có lịch phân ca -> audit, không tự công nhận công
        if (schedule == null) {
            return builder
                    .status(AttendanceCalcStatus.MISSING_SCHEDULE)
                    .note("Có " + logSummary.getLogEntries().size() + " lượt quẹt nhưng chưa được xếp ca")
                    .lateMinutes(0).earlyLeaveMinutes(0).workingHours(0.0)
                    .isNightShift(false)
                    .build();
        }

        Optional<ShiftTemplate> shiftOpt = shiftTemplateRepository.findById(schedule.getShiftId());
        if (shiftOpt.isEmpty()) {
            return builder
                    .status(AttendanceCalcStatus.ABSENT)
                    .note("Shift template not found")
                    .lateMinutes(0).earlyLeaveMinutes(0).workingHours(0.0)
                    .isNightShift(false)
                    .build();
        }

        ShiftTemplate shift = shiftOpt.get();
        builder.shiftId(shift.getShiftId())
                .scheduledStartTime(shift.getStartTime())
                .scheduledEndTime(shift.getEndTime())
                .isNightShift(Boolean.TRUE.equals(shift.getIsNightShift()));

        if (logSummary.getLogEntries() == null || logSummary.getLogEntries().isEmpty()) {
            return builder
                    .status(AttendanceCalcStatus.ABSENT)
                    .note("No log entries found")
                    .lateMinutes(0).earlyLeaveMinutes(0).workingHours(0.0)
                    .build();
        }

        return calculateWorkingTime(builder, shift, logSummary.getLogEntries(), processDate);
    }

    private AttendanceCalculationResult calculateWorkingTime(
            AttendanceCalculationResult.AttendanceCalculationResultBuilder builder,
            ShiftTemplate shift,
            List<EmployeeLogSummary.LogEntry> entries,
            LocalDate workDate
    ) {
        LocalDateTime scheduledStart = workDate.atTime(shift.getStartTime());
        LocalDateTime scheduledEnd = workDate.atTime(shift.getEndTime());
        if (Boolean.TRUE.equals(shift.getIsNightShift()) && shift.getEndTime().isBefore(shift.getStartTime())) {
            scheduledEnd = scheduledEnd.plusDays(1);
        }

        List<WorkSession> sessions = buildSessions(entries);

        if (sessions.isEmpty()) {
            return builder
                    .status(AttendanceCalcStatus.MISSING_LOG)
                    .note("Không tìm được phiên IN/OUT hợp lệ")
                    .lateMinutes(0).earlyLeaveMinutes(0).workingHours(0.0)
                    .consumedEventIds(sourceIds(entries))
                    .build();
        }

        LocalDateTime firstIn = sessions.get(0).start();
        WorkSession lastSession = sessions.get(sessions.size() - 1);
        boolean stillOpen = lastSession.end() == null; // chưa checkout cuối ngày
        LocalDateTime lastOut = stillOpen ? null : lastSession.end();

        long totalWorkedMinutes = sessions.stream()
                .filter(s -> s.end() != null)
                .mapToLong(s -> Duration.between(s.start(), s.end()).toMinutes())
                .sum();

        // Grace period
        LocalDateTime graceStart = scheduledStart.plusMinutes(nz(shift.getGraceInMinutes()));
        int lateMinutes = firstIn.isAfter(graceStart)
                ? (int) Duration.between(scheduledStart, firstIn).toMinutes() : 0;

        LocalDateTime graceEnd = scheduledEnd.minusMinutes(nz(shift.getGraceOutMinutes()));
        int earlyLeaveMinutes = (!stillOpen && lastOut.isBefore(graceEnd))
                ? (int) Duration.between(lastOut, scheduledEnd).toMinutes() : 0;

        // Break: có >= 2 phiên (nghỉ trưa thật) -> không trừ chồng break cố định
        boolean hasRealBreak = sessions.size() > 1;
        long breakApplied = hasRealBreak ? 0 : nz(shift.getBreakMinutes());
        long actualWorkingMinutes = Math.max(0, totalWorkedMinutes - breakApplied);

        // OT trước/sau ca (chưa xử lý OT ngày lễ - cần bảng company_holidays)
        int otBefore = firstIn.isBefore(scheduledStart)
                ? (int) Duration.between(firstIn, scheduledStart).toMinutes() : 0;
        int otAfter = (!stillOpen && lastOut.isAfter(scheduledEnd))
                ? (int) Duration.between(scheduledEnd, lastOut).toMinutes() : 0;

        AttendanceCalcStatus status = stillOpen ? AttendanceCalcStatus.MISSING_LOG
                : lateMinutes > 0 ? AttendanceCalcStatus.LATE
                : earlyLeaveMinutes > 0 ? AttendanceCalcStatus.EARLY_LEAVE
                : AttendanceCalcStatus.PRESENT;

        StringBuilder note = new StringBuilder();
        if (stillOpen) note.append("Thiếu check-out cuối ngày. ");
        if (lateMinutes > 0) note.append("Trễ ").append(lateMinutes).append(" phút. ");
        if (earlyLeaveMinutes > 0) note.append("Về sớm ").append(earlyLeaveMinutes).append(" phút. ");
        if (hasRealBreak) note.append("Có ").append(sessions.size() - 1).append(" lần nghỉ giữa ca. ");

        return builder
                .actualCheckIn(firstIn)
                .actualCheckOut(lastOut)
                .status(status)
                .lateMinutes(lateMinutes)
                .earlyLeaveMinutes(earlyLeaveMinutes)
                .workingHours(actualWorkingMinutes / 60.0)
                .breakMinutesApplied((int) breakApplied)
                .otMinutesBefore(otBefore)
                .otMinutesAfter(otAfter)
                .otMinutesHoliday(0) // TODO: cần bảng company_holidays
                .note(note.toString().trim())
                .consumedEventIds(sourceIds(entries))
                .build();
    }

    /**
     * Gộp các lượt IN/OUT thành các phiên làm việc.
     * Nếu khoảng cách giữa 1 OUT và IN kế tiếp < mergeGapMinutes -> coi là liên tục, không cắt phiên.
     * Nếu >= mergeGapMinutes -> chốt phiên hiện tại, khoảng giữa 2 phiên là thời gian nghỉ thực tế.
     */
    private List<WorkSession> buildSessions(List<EmployeeLogSummary.LogEntry> entries) {
        long mergeGap = attendanceProperties.getMergeGapMinutes();

        List<WorkSession> sessions = new ArrayList<>();
        LocalDateTime sessionStart = null;
        int i = 0;

        while (i < entries.size()) {
            var e = entries.get(i);

            if ("IN".equals(e.getEventType()) && sessionStart == null) {
                sessionStart = e.getTimestamp();
                i++;
            } else if ("OUT".equals(e.getEventType()) && sessionStart != null) {
                LocalDateTime outTime = e.getTimestamp();
                int j = i + 1;
                while (j < entries.size() && "OUT".equals(entries.get(j).getEventType())) j++; // bỏ OUT trùng

                boolean merged = false;
                if (j < entries.size() && "IN".equals(entries.get(j).getEventType())) {
                    long gap = Duration.between(outTime, entries.get(j).getTimestamp()).toMinutes();
                    if (gap < mergeGap) {
                        i = j + 1; // gap ngắn -> coi như vẫn đang làm việc, gộp phiên
                        merged = true;
                    }
                }
                if (!merged) {
                    sessions.add(new WorkSession(sessionStart, outTime));
                    sessionStart = null;
                    i = j;
                }
            } else {
                i++; // sự kiện bất thường (2 IN liên tiếp, OUT khi chưa IN...) - bỏ qua
            }
        }

        if (sessionStart != null) {
            sessions.add(new WorkSession(sessionStart, null)); // phiên chưa checkout
        }
        return sessions;
    }

    private List<Long> sourceIds(List<EmployeeLogSummary.LogEntry> entries) {
        return entries.stream()
                .map(EmployeeLogSummary.LogEntry::getSourceEventId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private long nz(Integer v) {
        return v == null ? 0 : v;
    }

    private record WorkSession(LocalDateTime start, LocalDateTime end) {}
}