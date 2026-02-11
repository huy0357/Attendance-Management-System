package org.example.ams_be.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "shift_templates",
        uniqueConstraints = @UniqueConstraint(name = "uk_shift_code", columnNames = "shift_code"))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class ShiftTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "shift_id")
    private Long shiftId;

    @Column(name = "shift_code", nullable = false, length = 50)
    private String shiftCode;

    @Column(name = "shift_name", nullable = false, length = 255)
    private String shiftName;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "break_minutes", nullable = false)
    private Integer breakMinutes;

    @Column(name = "grace_in_minutes", nullable = false)
    private Integer graceInMinutes;

    @Column(name = "grace_out_minutes", nullable = false)
    private Integer graceOutMinutes;

    @Column(name = "is_night_shift", nullable = false)
    private Boolean isNightShift;

    @Column(name = "min_work_minutes", nullable = false)
    private Integer minWorkMinutes;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (isActive == null) isActive = true;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
