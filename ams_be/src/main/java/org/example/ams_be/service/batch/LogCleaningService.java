package org.example.ams_be.service.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ams_be.dto.AttendanceCalculationResult;
import org.example.ams_be.dto.EmployeeLogSummary;
import org.example.ams_be.entity.EmployeeSchedule;
import org.example.ams_be.entity.FaceEvent;
import org.example.ams_be.entity.ShiftTemplate;
import org.example.ams_be.repository.FaceEventRepository;
import org.example.ams_be.repository.ShiftTemplateRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class LogCleaningService {

    private final FaceEventRepository faceEventRepository;
    private final ShiftTemplateRepository shiftTemplateRepository;

    public void resetConsumedEventsForDate(LocalDate processDate) {
        faceEventRepository.unmarkConsumedForDate(processDate);
    }

    public List<EmployeeLogSummary> fetchAndCleanLogs(
            LocalDate processDate,
            Map<Long, EmployeeSchedule> schedules
    ) {
        LocalDateTime globalStart = processDate.atStartOfDay();
        LocalDateTime globalEnd = processDate.plusDays(1).atTime(12, 0);

        // Gọi method repo mới hỗ trợ Rerun
        List<FaceEvent> events = faceEventRepository.findEventsForBatch(globalStart, globalEnd, processDate);

        if (events.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, List<FaceEvent>> grouped = events.stream()
                .collect(Collectors.groupingBy(FaceEvent::getEmployeeId));

        List<EmployeeLogSummary> result = new ArrayList<>();

        for (Map.Entry<Long, List<FaceEvent>> entry : grouped.entrySet()) {
            Long employeeId = entry.getKey();
            EmployeeSchedule schedule = schedules.get(employeeId);

            LocalDateTime windowEnd = globalEnd;
            if (schedule != null) {
                ShiftTemplate shift = shiftTemplateRepository.findById(schedule.getShiftId()).orElse(null);
                if (shift != null && !Boolean.TRUE.equals(shift.getIsNightShift())) {
                    windowEnd = processDate.plusDays(1).atStartOfDay();
                }
            }
            final LocalDateTime finalWindowEnd = windowEnd;

            List<FaceEvent> employeeEvents = entry.getValue().stream()
                    .filter(e -> e.getEventTime().isBefore(finalWindowEnd))
                    .sorted(Comparator.comparing(FaceEvent::getEventTime))
                    .collect(Collectors.toList());

            if (employeeEvents.isEmpty()) continue;

            List<EmployeeLogSummary.LogEntry> entries = employeeEvents.stream()
                    .map(fe -> {
                        // FIX: Fallback direction nếu camera đẩy NULL (chấm công khuôn mặt)
                        String dir = fe.getDirection() != null ? fe.getDirection().trim().toUpperCase() : "UNKNOWN";
                        return EmployeeLogSummary.LogEntry.builder()
                                .eventType(dir)
                                .timestamp(fe.getEventTime())
                                .sourceEventId(fe.getId())
                                .build();
                    })
                    .collect(Collectors.toList());

            result.add(EmployeeLogSummary.builder()
                    .employeeId(employeeId)
                    .logEntries(entries)
                    .build());
        }

        return result;
    }

    public void markEventsConsumed(List<AttendanceCalculationResult> results, LocalDate processDate) {
        List<Long> consumedIds = results.stream()
                .flatMap(r -> r.getConsumedEventIds() == null ? Stream.<Long>empty() : r.getConsumedEventIds().stream())
                .collect(Collectors.toList());

        if (!consumedIds.isEmpty()) {
            faceEventRepository.markConsumed(consumedIds, processDate);
        }
    }
}