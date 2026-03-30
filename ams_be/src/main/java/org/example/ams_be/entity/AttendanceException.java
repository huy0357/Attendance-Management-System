
package org.example.ams_be.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ams_be.enums.ExceptionSeverity;
import org.example.ams_be.enums.ExceptionStatus;
import org.example.ams_be.enums.ExceptionType;

import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_exceptions", indexes = {
        @Index(name = "idx_exception_employee", columnList = "employee_id"),
        @Index(name = "idx_exception_status", columnList = "status"),
        @Index(name = "idx_exception_severity", columnList = "severity"),
        @Index(name = "idx_exception_occurrence", columnList = "occurrence_time"),
        @Index(name = "idx_exception_branch", columnList = "branch_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceException {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(name = "exception_type", nullable = false)
    private ExceptionType exceptionType;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false)
    private ExceptionSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ExceptionStatus status;

    @Column(name = "branch_id")
    private String branchId;

    @Column(name = "occurrence_time", nullable = false)
    private LocalDateTime occurrenceTime;

    @Column(name = "resolved_time")
    private LocalDateTime resolvedTime;

    @Column(name = "resolved_by")
    private String resolvedBy;

    @Column(name = "assigned_to")
    private String assignedTo;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "metadata", columnDefinition = "JSON")
    private String metadata;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = ExceptionStatus.OPEN;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}