package org.example.ams_be.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeLogSummary {

    private Long employeeId;
    private List<LogEntry> logEntries;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LogEntry {
        private String eventType;      // "IN" / "OUT"
        private LocalDateTime timestamp;
        private Long sourceEventId;    // MỚI: trace về face_events.id để mark consumed
    }
}