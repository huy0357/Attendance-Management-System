package org.example.ams_be.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ams_be.enums.AttendanceStatus;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LivePulseResponse {
    private List<LivePulseRecord> records;
    private Boolean hasMore;
    private LocalDateTime lastTimestamp;
    private Long totalCount;
    private Boolean realTimeEnabled;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class LivePulseRecord {
        private Long id;
        private EmployeeInfo employee;
        private LocalDateTime checkInTime;
        private LocalDateTime checkOutTime;
        private String location;
        private String branchId;
        private AttendanceStatus status;
        private Integer lateMinutes;
        private String kioskId;
        private Double faceConfidence;

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
}