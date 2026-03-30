package org.example.ams_be.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ams_be.enums.ExceptionSeverity;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DashboardKpiResponse {
    private TotalEmployeesKpi totalEmployees;
    private PresentTodayKpi presentToday;
    private LateCheckinsKpi lateCheckins;
    private ExceptionsKpi exceptions;
    private LocalDateTime generatedAt;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TotalEmployeesKpi {
        private Long count;
        private Long newThisMonth;
        private String trend; // UP, DOWN, STABLE
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PresentTodayKpi {
        private Long count;
        private Long total;
        private Double percentage;
        private LocalDateTime lastUpdated;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class LateCheckinsKpi {
        private Long count;
        private Integer changeFromYesterday;
        private Integer averageDelayMinutes;
        private String trend; // UP, DOWN, STABLE
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ExceptionsKpi {
        private Long count;
        private Map<ExceptionSeverity, Long> breakdown;
    }
}