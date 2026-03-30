package org.example.ams_be.repository;

import org.example.ams_be.entity.AttendanceRecord;
import org.example.ams_be.enums.AttendanceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {

    @Query("SELECT COUNT(DISTINCT ar.employee.id) FROM AttendanceRecord ar " +
            "WHERE ar.checkInTime BETWEEN :startDate AND :endDate " +
            "AND (:branchIds IS NULL OR ar.branchId IN :branchIds)")
    long countPresentEmployees(@Param("startDate") LocalDateTime startDate,
                               @Param("endDate") LocalDateTime endDate,
                               @Param("branchIds") List<String> branchIds);

    @Query("SELECT COUNT(ar) FROM AttendanceRecord ar " +
            "WHERE ar.status = 'LATE' " +
            "AND ar.checkInTime BETWEEN :startDate AND :endDate " +
            "AND (:branchIds IS NULL OR ar.branchId IN :branchIds)")
    long countLateCheckins(@Param("startDate") LocalDateTime startDate,
                           @Param("endDate") LocalDateTime endDate,
                           @Param("branchIds") List<String> branchIds);

    @Query("SELECT AVG(ar.lateMinutes) FROM AttendanceRecord ar " +
            "WHERE ar.status = 'LATE' " +
            "AND ar.checkInTime BETWEEN :startDate AND :endDate " +
            "AND (:branchIds IS NULL OR ar.branchId IN :branchIds)")
    Double calculateAverageDelayMinutes(@Param("startDate") LocalDateTime startDate,
                                        @Param("endDate") LocalDateTime endDate,
                                        @Param("branchIds") List<String> branchIds);

    @Query("SELECT ar FROM AttendanceRecord ar " +
            "WHERE (:branchIds IS NULL OR ar.branchId IN :branchIds) " +
            "AND (:since IS NULL OR ar.checkInTime > :since) " +
            "ORDER BY ar.checkInTime DESC")
    List<AttendanceRecord> findRecentAttendanceRecords(@Param("branchIds") List<String> branchIds,
                                                       @Param("since") LocalDateTime since,
                                                       Pageable pageable);

    @Query("SELECT COUNT(ar) FROM AttendanceRecord ar " +
            "WHERE DATE(ar.checkInTime) = CURRENT_DATE " +
            "AND (:branchIds IS NULL OR ar.branchId IN :branchIds)")
    long countTodayAttendanceRecords(@Param("branchIds") List<String> branchIds);

    @Query("SELECT ar FROM AttendanceRecord ar " +
            "WHERE ar.employee.id = :employeeId " +
            "AND ar.checkInTime BETWEEN :startDate AND :endDate " +
            "ORDER BY ar.checkInTime DESC")
    List<AttendanceRecord> findByEmployeeAndDateRange(@Param("employeeId") Long employeeId,
                                                      @Param("startDate") LocalDateTime startDate,
                                                      @Param("endDate") LocalDateTime endDate);

    @Query("SELECT ar FROM AttendanceRecord ar " +
            "WHERE ar.status = :status " +
            "AND (:branchIds IS NULL OR ar.branchId IN :branchIds) " +
            "ORDER BY ar.checkInTime DESC")
    Page<AttendanceRecord> findByStatusAndBranchIds(@Param("status") AttendanceStatus status,
                                                    @Param("branchIds") List<String> branchIds,
                                                    Pageable pageable);
}