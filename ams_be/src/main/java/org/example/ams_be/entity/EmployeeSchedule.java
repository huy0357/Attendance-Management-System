package org.example.ams_be.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_schedules")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class EmployeeSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "schedule_id")
    private Long scheduleId;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "shift_id", nullable = false)
    private Long shiftId;

    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_source", nullable = false)
    private ScheduleSource scheduleSource;

    @Column(name = "note", columnDefinition = "text")
    private String note;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum ScheduleSource {
        MANUAL, IMPORT
    }
}
