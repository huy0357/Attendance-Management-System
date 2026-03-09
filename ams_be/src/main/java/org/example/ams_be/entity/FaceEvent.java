package org.example.ams_be.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "face_events",
        indexes = {
                @Index(name = "idx_face_events_emp_time", columnList = "employee_id,event_time"),
                @Index(name = "idx_face_events_time", columnList = "event_time")
        })
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FaceEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id") // PK = id
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "device_id")
    private Long deviceId;

    @Column(name = "event_time", nullable = false)
    private LocalDateTime eventTime;

    @Column(name = "direction")
    private String direction; // IN / OUT

    @Column(name = "match_status")
    private String matchStatus; // MATCH / ...

    @Column(name = "similarity_score")
    private Double similarityScore;

    @Column(name = "raw_payload", columnDefinition = "json")
    private String rawPayload;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}