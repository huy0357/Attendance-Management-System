package org.example.ams_be.service.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ams_be.dto.EmployeeLogSummary;
import org.example.ams_be.entity.FaceEvent;
import org.example.ams_be.repository.FaceEventRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LogCleaningService {

    private final FaceEventRepository faceEventRepository;

    public List<EmployeeLogSummary> fetchAndCleanLogs(LocalDate processDate) {

        LocalDateTime start = processDate.atStartOfDay();
        LocalDateTime end = processDate.plusDays(1).atStartOfDay();

        // 1️⃣ Fetch events
        List<FaceEvent> events = faceEventRepository.findMatchedEventsBetween(start, end)
                .stream()
                .filter(e -> "MATCH".equalsIgnoreCase(e.getMatchStatus()))
                .collect(Collectors.toList());

        log.info("DEBUG face_events fetched={}", events.size());

        events.forEach(ev ->
                log.info("DEBUG raw emp={} dir={} time={}",
                        ev.getEmployeeId(),
                        ev.getDirection(),
                        ev.getEventTime())
        );

        if (events.isEmpty()) {
            return Collections.emptyList();
        }

        // 2️⃣ Group by employeeId
        Map<Long, List<FaceEvent>> grouped = events.stream()
                .collect(Collectors.groupingBy(FaceEvent::getEmployeeId));

        List<EmployeeLogSummary> result = new ArrayList<>();

        // 3️⃣ Convert to EmployeeLogSummary
        for (Map.Entry<Long, List<FaceEvent>> entry : grouped.entrySet()) {

            Long employeeId = entry.getKey();

            List<EmployeeLogSummary.LogEntry> entries =
                    entry.getValue().stream()
                            .sorted(Comparator.comparing(FaceEvent::getEventTime))
                            .map(fe -> EmployeeLogSummary.LogEntry.builder()
                                    .eventType(
                                            fe.getDirection() == null
                                                    ? null
                                                    : fe.getDirection().trim().toUpperCase()
                                    )
                                    .timestamp(fe.getEventTime())
                                    .build())
                            .collect(Collectors.toList());

            log.info("DEBUG cleaned emp={} entries={}", employeeId, entries.size());

            result.add(
                    EmployeeLogSummary.builder()
                            .employeeId(employeeId)
                            .logEntries(entries)
                            .build()
            );
        }

        return result;
    }
}