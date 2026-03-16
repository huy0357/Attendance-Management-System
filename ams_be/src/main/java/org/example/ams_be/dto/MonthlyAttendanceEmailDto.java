package org.example.ams_be.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyAttendanceEmailDto {
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String email;
    private String monthKey;

    private BigDecimal workDays;
    private BigDecimal leaveDays;
    private BigDecimal absentDays;
    private Integer lateMinutes;
    private Integer otMinutes;
}