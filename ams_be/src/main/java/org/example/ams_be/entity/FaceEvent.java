package org.example.ams_be.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "face_events")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class FaceEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id")
    private Long employeeId;

    @Column(name = "device_id")
    private Long deviceId;

    @Column(name = "event_time")
    private LocalDateTime eventTime;

    @Column(name = "direction")
    private String direction;

    @Column(name = "match_status")
    private String matchStatus;

    @Column(name = "similarity_score")
    private Float similarityScore;

    @Column(name = "raw_payload", columnDefinition = "json")
    private String rawPayload;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // MỚI: đánh dấu event này đã được dùng để tính công cho ngày nào,
    // tránh batch ngày hôm sau lấy trùng event checkout của ca đêm
    @Column(name = "consumed_for_date")
    private LocalDate consumedForDate;
}