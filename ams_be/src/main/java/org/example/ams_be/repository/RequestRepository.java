package org.example.ams_be.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.example.ams_be.entity.Requests;
import org.example.ams_be.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RequestRepository extends JpaRepository<Requests, Long> {

    List<Requests> findByEmployee_EmployeeIdOrderByCreatedAtDesc(Long employeeId);

    List<Requests> findByStatus(org.example.ams_be.enums.RequestStatus status);
    @Query("""
        SELECT r FROM Requests r
        WHERE r.status = :status
          AND r.startDatetime <= :endOfDay
          AND r.endDatetime   >= :startOfDay
    """)
    List<Requests> findApprovedRequestsOverlappingDay(
            @Param("status") RequestStatus status,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );
}
