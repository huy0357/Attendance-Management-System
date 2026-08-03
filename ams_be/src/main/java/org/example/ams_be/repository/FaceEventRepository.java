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

    // UPDATE FIX 1: Cho phép lấy event chưa dùng HOẶC đã dùng đúng cho processDate này (để phục vụ Rerun)
    @Query("""
        SELECT e FROM FaceEvent e
        WHERE e.eventTime >= :start AND e.eventTime < :end
          AND UPPER(e.matchStatus) = 'MATCH'
          AND (e.consumedForDate IS NULL OR e.consumedForDate = :processDate)
        ORDER BY e.eventTime ASC
        """)
    List<FaceEvent> findEventsForBatch(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("processDate") LocalDate processDate
    );

    // FIX RERUN: Reset consumedForDate về null trước khi rerun ngày đó
    @Modifying
    @Query("UPDATE FaceEvent e SET e.consumedForDate = NULL WHERE e.consumedForDate = :processDate")
    void unmarkConsumedForDate(@Param("processDate") LocalDate processDate);

    @Modifying
    @Query("UPDATE FaceEvent e SET e.consumedForDate = :processDate WHERE e.id IN :ids")
    void markConsumed(@Param("ids") List<Long> ids, @Param("processDate") LocalDate processDate);
}