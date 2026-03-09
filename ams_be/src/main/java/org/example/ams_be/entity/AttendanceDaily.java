package org.example.ams_be.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_daily")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceDaily {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attendance_id")
    private Long attendanceId;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "shift_id")
    private Long shiftId;

    // DB columns:
    // first_in_time (datetime), last_out_time (datetime)
    @Column(name = "first_in_time")
    private LocalDateTime firstInTime;

    @Column(name = "last_out_time")
    private LocalDateTime lastOutTime;

    // total working minutes
    @Column(name = "work_minutes")
    private Integer workMinutes;

    @Column(name = "late_minutes")
    private Integer lateMinutes;

    @Column(name = "early_leave_minutes")
    private Integer earlyLeaveMinutes;

    @Column(name = "break_minutes")
    private Integer breakMinutes;

    @Column(name = "ot_minutes_before")
    private Integer otMinutesBefore;

    @Column(name = "ot_minutes_after")
    private Integer otMinutesAfter;

    @Column(name = "ot_minutes_holiday")
    private Integer otMinutesHoliday;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private AttendanceStatus status;

    @Column(name = "calculated_at")
    private LocalDateTime calculatedAt;

    // json column in DB
    @Column(name = "inputs_snapshot_json", columnDefinition = "json")
    private String inputsSnapshotJson;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (calculatedAt == null) calculatedAt = now;
        if (updatedAt == null) updatedAt = now;

        if (lateMinutes == null) lateMinutes = 0;
        if (earlyLeaveMinutes == null) earlyLeaveMinutes = 0;
        if (workMinutes == null) workMinutes = 0;
        if (breakMinutes == null) breakMinutes = 0;
        if (otMinutesBefore == null) otMinutesBefore = 0;
        if (otMinutesAfter == null) otMinutesAfter = 0;
        if (otMinutesHoliday == null) otMinutesHoliday = 0;

        if (status == null) status = AttendanceStatus.ABSENT;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // enum trong DB: enum('PRESENT','ABSENT','LEAVE')
    public enum AttendanceStatus {
        PRESENT,
        ABSENT,
        LEAVE
    }
}