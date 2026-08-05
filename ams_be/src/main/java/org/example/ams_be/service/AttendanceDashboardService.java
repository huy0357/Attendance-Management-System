package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ams_be.dto.response.DashboardKpiResponse;
import org.example.ams_be.dto.response.ExceptionsResponse;
import org.example.ams_be.dto.response.LivePulseResponse;
import org.example.ams_be.entity.AttendanceException;
import org.example.ams_be.entity.AttendanceRecord;
import org.example.ams_be.entity.Employee;
import org.example.ams_be.enums.ExceptionSeverity;
import org.example.ams_be.enums.ExceptionStatus;
import org.example.ams_be.repository.AttendanceExceptionRepository;
import org.example.ams_be.repository.AttendanceRecordRepository;
import org.example.ams_be.repository.EmployeeRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceDashboardService {

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AttendanceExceptionRepository attendanceExceptionRepository;
    private final EmployeeRepository employeeRepository;
    private final ApplicationEventPublisher eventPublisher;

    public DashboardKpiResponse getKpiMetrics(LocalDate date, List<String> branchIds, String timezone) {
        log.info("Calculating KPI metrics for date: {}, branches: {}, timezone: {}", date, branchIds, timezone);

        long totalEmployees = employeeRepository.countAll();
        if (branchIds != null && !branchIds.isEmpty()) {
            // Chưa có count theo branch trong EmployeeRepository
            totalEmployees = employeeRepository.countAll();
        }

        long newEmployeesThisMonth = calculateNewEmployeesThisMonth(branchIds);

        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(LocalTime.MAX);

        long presentToday = attendanceRecordRepository.countPresentEmployees(
                startOfDay, endOfDay, branchIds);

        double presentPercentage = totalEmployees > 0
                ? (double) presentToday / totalEmployees * 100
                : 0;

        long lateCheckinsToday = attendanceRecordRepository.countLateCheckins(
                startOfDay, endOfDay, branchIds);

        long lateCheckinsYesterday = attendanceRecordRepository.countLateCheckins(
                startOfDay.minusDays(1), endOfDay.minusDays(1), branchIds);

        Double averageDelayMinutes = attendanceRecordRepository.calculateAverageDelayMinutes(
                startOfDay, endOfDay, branchIds);

        Map<ExceptionSeverity, Long> exceptionBreakdown =
                attendanceExceptionRepository.countExceptionsBySeverity(branchIds);

        long totalExceptions = exceptionBreakdown.values().stream()
                .mapToLong(Long::longValue)
                .sum();

        return DashboardKpiResponse.builder()
                .totalEmployees(DashboardKpiResponse.TotalEmployeesKpi.builder()
                        .count(totalEmployees)
                        .newThisMonth(newEmployeesThisMonth)
                        .trend(newEmployeesThisMonth > 0 ? "UP" : "STABLE")
                        .build())
                .presentToday(DashboardKpiResponse.PresentTodayKpi.builder()
                        .count(presentToday)
                        .total(totalEmployees)
                        .percentage(Math.round(presentPercentage * 100.0) / 100.0)
                        .lastUpdated(LocalDateTime.now())
                        .build())
                .lateCheckins(DashboardKpiResponse.LateCheckinsKpi.builder()
                        .count(lateCheckinsToday)
                        .changeFromYesterday((int) (lateCheckinsToday - lateCheckinsYesterday))
                        .averageDelayMinutes(averageDelayMinutes != null ? averageDelayMinutes.intValue() : 0)
                        .trend(lateCheckinsToday < lateCheckinsYesterday
                                ? "DOWN"
                                : lateCheckinsToday > lateCheckinsYesterday ? "UP" : "STABLE")
                        .build())
                .exceptions(DashboardKpiResponse.ExceptionsKpi.builder()
                        .count(totalExceptions)
                        .breakdown(exceptionBreakdown)
                        .build())
                .generatedAt(LocalDateTime.now())
                .build();
    }

    @Transactional(readOnly = true)
    public LivePulseResponse getLivePulse(Integer limit, List<String> branchIds,
                                          LocalDateTime since, Boolean includeCheckOut) {

        int safeLimit = (limit == null || limit <= 0) ? 20 : limit;

        Pageable pageable = PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "checkInTime"));
        List<AttendanceRecord> records = attendanceRecordRepository.findRecentAttendanceRecords(
                branchIds, since, pageable);

        List<LivePulseResponse.LivePulseRecord> pulseRecords = records.stream()
                .map(this::mapToLivePulseRecord)
                .toList();

        LocalDateTime lastTimestamp = pulseRecords.isEmpty() ? null
                : pulseRecords.get(0).getCheckInTime();

        boolean hasMore = records.size() >= safeLimit;

        long totalTodayCount = attendanceRecordRepository.countTodayAttendanceRecords(branchIds);

        return LivePulseResponse.builder()
                .records(pulseRecords)
                .hasMore(hasMore)
                .lastTimestamp(lastTimestamp)
                .totalCount(totalTodayCount)
                .realTimeEnabled(true)
                .build();
    }

    @Transactional(readOnly = true)
    public ExceptionsResponse getExceptions(List<ExceptionStatus> status,
                                            List<ExceptionSeverity> severity,
                                            List<String> branchIds,
                                            Integer limit, Integer offset,
                                            String sortBy, String sortOrder) {

        int safeLimit = (limit == null || limit <= 0) ? 20 : limit;
        int safeOffset = (offset == null || offset < 0) ? 0 : offset;
        String safeSortBy = (sortBy == null || sortBy.isBlank()) ? "occurrenceTime" : sortBy;
        String safeSortOrder = (sortOrder == null || sortOrder.isBlank()) ? "DESC" : sortOrder;

        Pageable pageable = PageRequest.of(
                safeOffset / safeLimit,
                safeLimit,
                Sort.by("ASC".equalsIgnoreCase(safeSortOrder) ? Sort.Direction.ASC : Sort.Direction.DESC, safeSortBy)
        );

        Page<AttendanceException> exceptionsPage = attendanceExceptionRepository.findExceptionsWithFilters(
                status, severity, branchIds, pageable);

        List<ExceptionsResponse.ExceptionRecord> exceptionRecords = exceptionsPage.getContent().stream()
                .map(this::mapToExceptionRecord)
                .toList();

        return ExceptionsResponse.builder()
                .exceptions(exceptionRecords)
                .pagination(ExceptionsResponse.PaginationInfo.builder()
                        .total(exceptionsPage.getTotalElements())
                        .limit(safeLimit)
                        .offset(safeOffset)
                        .hasMore(exceptionsPage.hasNext())
                        .build())
                .build();
    }

    @Transactional
    public void resolveException(Long exceptionId, String notes, String resolvedBy) {
        AttendanceException exception = attendanceExceptionRepository.findById(exceptionId)
                .orElseThrow(() -> new EntityNotFoundException("Exception not found: " + exceptionId));

        exception.setStatus(ExceptionStatus.RESOLVED);
        exception.setResolvedTime(LocalDateTime.now());
        exception.setResolvedBy(resolvedBy);
        exception.setNotes(notes);

        attendanceExceptionRepository.save(exception);

        log.info("Exception {} resolved by {}", exceptionId, resolvedBy);
    }

    private LivePulseResponse.LivePulseRecord mapToLivePulseRecord(AttendanceRecord record) {
        Employee employee = record.getEmployee();

        return LivePulseResponse.LivePulseRecord.builder()
                .id(record.getId())
                .employee(LivePulseResponse.LivePulseRecord.EmployeeInfo.builder()
                        .id(employee != null ? employee.getEmployeeId() : null)
                        .name(employee != null ? employee.getFullName() : null)
                        .employeeCode(employee != null ? employee.getEmployeeCode() : null)
                        .avatar(employee != null ? employee.getAvatarUrl() : null)
                        .department(employee != null ? formatDepartment(employee) : null)
                        .build())
                .checkInTime(record.getCheckInTime())
                .checkOutTime(record.getCheckOutTime())
                .location(record.getLocation())
                .branchId(record.getBranchId())
                .status(record.getStatus())
                .lateMinutes(record.getLateMinutes())
                .kioskId(record.getKioskId())
                .faceConfidence(record.getFaceConfidence())
                .build();
    }

    private ExceptionsResponse.ExceptionRecord mapToExceptionRecord(AttendanceException exception) {
        Employee employee = exception.getEmployee();

        return ExceptionsResponse.ExceptionRecord.builder()
                .id(exception.getId())
                .employee(ExceptionsResponse.ExceptionRecord.EmployeeInfo.builder()
                        .id(employee != null ? employee.getEmployeeId() : null)
                        .name(employee != null ? employee.getFullName() : null)
                        .employeeCode(employee != null ? employee.getEmployeeCode() : null)
                        .avatar(employee != null ? employee.getAvatarUrl() : null)
                        .department(employee != null ? formatDepartment(employee) : null)
                        .build())
                .exceptionType(exception.getExceptionType())
                .description(exception.getDescription())
                .severity(exception.getSeverity())
                .status(exception.getStatus())
                .occurrenceTime(exception.getOccurrenceTime())
                .branchId(exception.getBranchId())
                .assignedTo(exception.getAssignedTo())
                .resolvedTime(exception.getResolvedTime())
                .resolvedBy(exception.getResolvedBy())
                .notes(exception.getNotes())
                .estimatedResolutionTime(calculateEstimatedResolutionTime(exception))
                .build();
    }

    private String formatDepartment(Employee employee) {
        if (employee.getDepartmentId() == null) {
            return null;
        }
        return "Department #" + employee.getDepartmentId();
    }

    private LocalDateTime calculateEstimatedResolutionTime(AttendanceException exception) {
        LocalDateTime baseTime = exception.getOccurrenceTime();
        return switch (exception.getSeverity()) {
            case URGENT -> baseTime.plusHours(2);
            case HIGH -> baseTime.plusHours(8);
            case MEDIUM -> baseTime.plusDays(1);
            case LOW -> baseTime.plusDays(3);
        };
    }

    private long calculateNewEmployeesThisMonth(List<String> branchIds) {
        return 5;
    }
}