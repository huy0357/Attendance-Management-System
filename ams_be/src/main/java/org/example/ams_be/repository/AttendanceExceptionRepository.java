package org.example.ams_be.repository;

import org.example.ams_be.entity.AttendanceException;
import org.example.ams_be.enums.ExceptionSeverity;
import org.example.ams_be.enums.ExceptionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public interface AttendanceExceptionRepository extends JpaRepository<AttendanceException, Long> {

    @Query("SELECT ae.severity, COUNT(ae) FROM AttendanceException ae " +
            "WHERE ae.status != 'RESOLVED' " +
            "AND (:branchIds IS NULL OR ae.branchId IN :branchIds) " +
            "GROUP BY ae.severity")
    List<Object[]> countExceptionsBySeverityRaw(@Param("branchIds") List<String> branchIds);

    default Map<ExceptionSeverity, Long> countExceptionsBySeverity(List<String> branchIds) {
        List<Object[]> results = countExceptionsBySeverityRaw(branchIds);
        return results.stream()
                .collect(java.util.stream.Collectors.toMap(
                        r -> (ExceptionSeverity) r[0],
                        r -> (Long) r[1]
                ));
    }

    @Query("SELECT ae FROM AttendanceException ae " +
            "WHERE (:status IS NULL OR ae.status IN :status) " +
            "AND (:severity IS NULL OR ae.severity IN :severity) " +
            "AND (:branchIds IS NULL OR ae.branchId IN :branchIds)")
    Page<AttendanceException> findExceptionsWithFilters(@Param("status") List<ExceptionStatus> status,
                                                        @Param("severity") List<ExceptionSeverity> severity,
                                                        @Param("branchIds") List<String> branchIds,
                                                        Pageable pageable);

    @Query("SELECT COUNT(ae) FROM AttendanceException ae " +
            "WHERE ae.status = 'OPEN' " +
            "AND ae.assignedTo = :assignedTo")
    long countOpenExceptionsByAssignee(@Param("assignedTo") String assignedTo);

    @Query("SELECT ae FROM AttendanceException ae " +
            "WHERE ae.employee.id = :employeeId " +
            "ORDER BY ae.occurrenceTime DESC")
    List<AttendanceException> findByEmployeeId(@Param("employeeId") Long employeeId);

    @Query("SELECT ae FROM AttendanceException ae " +
            "WHERE ae.severity = 'URGENT' " +
            "AND ae.status = 'OPEN' " +
            "ORDER BY ae.occurrenceTime ASC")
    List<AttendanceException> findUrgentOpenExceptions();
}