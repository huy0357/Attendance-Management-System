package org.example.ams_be.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ams_be.enums.AttendanceStatus;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "attendance_records", indexes = {
        @Index(name = "idx_attendance_employee_date", columnList = "employee_id, check_in_time"),
        @Index(name = "idx_attendance_branch_date", columnList = "branch_id, check_in_time"),
        @Index(name = "idx_attendance_status", columnList = "status"),
        @Index(name = "idx_attendance_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "check_in_time")
    private LocalDateTime checkInTime;

    @Column(name = "check_out_time")
    private LocalDateTime checkOutTime;

    @Column(name = "location")
    private String location;

    @Column(name = "branch_id")
    private String branchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private AttendanceStatus status;

    @Column(name = "expected_check_in")
    private LocalTime expectedCheckIn;

    @Column(name = "late_minutes")
    private Integer lateMinutes;

    @Column(name = "kiosk_id")
    private String kioskId;

    @Column(name = "device_info")
    private String deviceInfo;

    @Column(name = "face_confidence")
    private Double faceConfidence;

    @Column(name = "is_manual_entry")
    private Boolean isManualEntry = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}