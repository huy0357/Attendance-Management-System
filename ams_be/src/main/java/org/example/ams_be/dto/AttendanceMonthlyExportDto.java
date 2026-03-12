package org.example.ams_be.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceMonthlyExportDto {
    private String monthKey;
    private Long employeeId;
    private String employeeCode;
    private String fullName;
    private String email;
    private Long departmentId;
    private BigDecimal workDays;
    private BigDecimal leaveDays;
    private BigDecimal absentDays;
    private Integer lateMinutes;
    private Integer otMinutes;
    private LocalDateTime generatedAt;
}