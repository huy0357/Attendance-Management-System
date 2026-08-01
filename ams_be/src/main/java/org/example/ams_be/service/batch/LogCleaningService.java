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

    public List<EmployeeLogSummary> fetchAndCleanLogs(
            LocalDate processDate,
            Map<Long, EmployeeSchedule> schedules
    ) {
        LocalDateTime globalStart = processDate.atStartOfDay();
        // mở rộng tới 12h trưa hôm sau để chắc chắn bắt được checkout của ca đêm
        LocalDateTime globalEnd = processDate.plusDays(1).atTime(12, 0);

        List<FaceEvent> events = faceEventRepository
                .findUnconsumedMatchedEventsBetween(globalStart, globalEnd);

        log.info("DEBUG face_events fetched={} (window {} -> {})", events.size(), globalStart, globalEnd);

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
                // ca ngày (không phải ca đêm): không cần nhìn qua sáng hôm sau
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
                    .map(fe -> EmployeeLogSummary.LogEntry.builder()
                            .eventType(fe.getDirection() == null ? null : fe.getDirection().trim().toUpperCase())
                            .timestamp(fe.getEventTime())
                            .sourceEventId(fe.getId())
                            .build())
                    .collect(Collectors.toList());

            result.add(EmployeeLogSummary.builder()
                    .employeeId(employeeId)
                    .logEntries(entries)
                    .build());
        }

        return result;
    }

    /** Gọi sau khi đã lưu attendance_daily, tránh batch ngày hôm sau ăn trùng event ca đêm đã dùng */
    public void markEventsConsumed(List<AttendanceCalculationResult> results, LocalDate processDate) {
        List<Long> consumedIds = results.stream()
                .flatMap(r -> r.getConsumedEventIds() == null ? Stream.<Long>empty() : r.getConsumedEventIds().stream())
                .collect(Collectors.toList());

        if (!consumedIds.isEmpty()) {
            faceEventRepository.markConsumed(consumedIds, processDate);
            log.info("Marked {} face_events consumed for date {}", consumedIds.size(), processDate);
        }
    }
}