package org.example.ams_be.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ams_be.enums.ExceptionSeverity;
import org.example.ams_be.enums.ExceptionStatus;
import org.example.ams_be.enums.ExceptionType;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ExceptionsResponse {
    private List<ExceptionRecord> exceptions;
    private PaginationInfo pagination;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ExceptionRecord {
        private Long id;
        private EmployeeInfo employee;
        private ExceptionType exceptionType;
        private String description;
        private ExceptionSeverity severity;
        private ExceptionStatus status;
        private LocalDateTime occurrenceTime;
        private String branchId;
        private String assignedTo;
        private LocalDateTime resolvedTime;
        private String resolvedBy;
        private String notes;
        private LocalDateTime estimatedResolutionTime;

        @Data
        @Builder
        @AllArgsConstructor
        @NoArgsConstructor
        public static class EmployeeInfo {
            private Long id;
            private String name;
            private String employeeCode;
            private String avatar;
            private String department;
        }
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PaginationInfo {
        private Long total;
        private Integer limit;
        private Integer offset;
        private Boolean hasMore;
    }
}