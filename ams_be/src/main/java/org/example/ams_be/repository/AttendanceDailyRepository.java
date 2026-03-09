package org.example.ams_be.repository;

import org.example.ams_be.entity.AttendanceDaily;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface AttendanceDailyRepository extends JpaRepository<AttendanceDaily, Long> {
    Optional<AttendanceDaily> findByEmployeeIdAndWorkDate(Long employeeId, LocalDate workDate);
    Page<AttendanceDaily> findByWorkDateBetween(LocalDate from, LocalDate to, Pageable pageable);

    Page<AttendanceDaily> findByEmployeeIdAndWorkDateBetween(Long employeeId, LocalDate from, LocalDate to, Pageable pageable);
}