package org.example.ams_be.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.example.ams_be.entity.Requests;
import org.example.ams_be.enums.RequestStatus;
import org.example.ams_be.enums.RequestType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RequestRepository extends JpaRepository<Requests, Long> {

    // 1. Lấy danh sách cá nhân có Paging và Filter (Dùng cho màn My OT Requests)
    @Query("""
        SELECT r FROM Requests r 
        WHERE r.employee.employeeId = :employeeId 
          AND (:status IS NULL OR r.status = :status)
          AND (:type IS NULL OR r.requestType = :type)
    """)
    Page<Requests> findByEmployeeWithFilter(
            @Param("employeeId") Long employeeId, 
            @Param("status") RequestStatus status, 
            @Param("type") RequestType type, 
            Pageable pageable);

    // 2. Lấy danh sách cho Manager (Hàng đợi duyệt - Manager Queue)
    @Query("""
        SELECT r FROM Requests r 
        WHERE r.employee.managerId = :managerId 
          AND (:status IS NULL OR r.status = :status)
          AND (:type IS NULL OR r.requestType = :type)
    """)
    Page<Requests> findByManagerQueue(
            @Param("managerId") Long managerId, 
            @Param("status") RequestStatus status, 
            @Param("type") RequestType type, 
            Pageable pageable);

    // 3. Lấy toàn bộ (Dùng cho Admin / Global Management)
    @Query("""
        SELECT r FROM Requests r 
        WHERE (:status IS NULL OR r.status = :status)
          AND (:type IS NULL OR r.requestType = :type)
    """)
    Page<Requests> findAllGlobal(
            @Param("status") RequestStatus status, 
            @Param("type") RequestType type, 
            Pageable pageable);
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
