package org.example.ams_be.repository;

import org.example.ams_be.entity.FaceEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface FaceEventRepository extends JpaRepository<FaceEvent, Long> {


    @Query(value = """
    SELECT *
    FROM face_events
    WHERE event_time >= :start
      AND event_time < :end
    ORDER BY employee_id, event_time
""", nativeQuery = true)
    List<FaceEvent> findMatchedEventsBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );
}