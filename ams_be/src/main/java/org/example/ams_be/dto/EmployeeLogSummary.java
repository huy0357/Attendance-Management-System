package org.example.ams_be.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeLogSummary {
    private Long employeeId;
    private List<LogEntry> logEntries;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LogEntry {
        private LocalDateTime timestamp;
        private String eventType; // IN / OUT
    }
}