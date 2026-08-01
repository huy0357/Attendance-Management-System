package org.example.ams_be.repository;

import org.example.ams_be.entity.FaceEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface FaceEventRepository extends JpaRepository<FaceEvent, Long> {

    @Query("""
        SELECT e FROM FaceEvent e
        WHERE e.eventTime >= :start AND e.eventTime < :end
          AND UPPER(e.matchStatus) = 'MATCH'
          AND e.consumedForDate IS NULL
        ORDER BY e.eventTime
        """)
    List<FaceEvent> findUnconsumedMatchedEventsBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Modifying
    @Query("UPDATE FaceEvent e SET e.consumedForDate = :processDate WHERE e.id IN :ids")
    void markConsumed(@Param("ids") List<Long> ids, @Param("processDate") LocalDate processDate);
}