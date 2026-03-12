package org.example.ams_be.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_summary_monthly")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceSummaryMonthly {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "summary_id")
    private Long summaryId;

    @Column(name = "month_key", nullable = false, length = 7)
    private String monthKey; // yyyy-MM

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "work_days", precision = 5, scale = 2)
    private BigDecimal workDays;

    @Column(name = "leave_days", precision = 5, scale = 2)
    private BigDecimal leaveDays;

    @Column(name = "ot_minutes")
    private Integer otMinutes;

    @Column(name = "late_minutes")
    private Integer lateMinutes;

    @Column(name = "absent_days", precision = 5, scale = 2)
    private BigDecimal absentDays;

    @Column(name = "generated_at")
    private LocalDateTime generatedAt;
}