package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.example.ams_be.dto.response.AttendanceDailyResponse;
import org.example.ams_be.security.UserPrincipal;
import org.example.ams_be.service.AttendanceDailyService;
import org.example.ams_be.service.batch.AttendanceBatchService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/attendance-daily")
public class AttendanceDailyController {

    private final AttendanceDailyService attendanceDailyService;  
    private final AttendanceBatchService attendanceBatchService;


    // ADMIN/HR: xem bảng công tổng
    // GET /api/attendance-daily/admin?from=2026-02-01&to=2026-02-29&page=0&size=20
    @GetMapping("/admin")
    // @PreAuthorize("hasRole('ADMIN') or hasRole('HR')")
    public Page<AttendanceDailyResponse> adminGetAttendance(
            @RequestParam LocalDate from,
            @RequestParam LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return attendanceDailyService.adminGetAttendance(from, to, pageable);
    }

    private final org.example.ams_be.repository.EmployeeRepository employeeRepository;

    // EMPLOYEE: xem bảng công theo employeeId
    // GET /api/attendance-daily/employee/5?from=2026-02-01&to=2026-02-29&page=0&size=20
    @GetMapping("/employee/{employeeId}")
    public Page<AttendanceDailyResponse> employeeGetAttendance(
            @PathVariable Long employeeId,
            @RequestParam LocalDate from,
            @RequestParam LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String role = principal.getRole();
        Long currentEmployeeId = principal.getEmployeeId();

        if ("EMPLOYEE".equalsIgnoreCase(role)) {
            if (!employeeId.equals(currentEmployeeId)) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.FORBIDDEN, "Access Denied: You can only view your own attendance"
                );
            }
        } else if ("MANAGER".equalsIgnoreCase(role)) {
            if (!employeeId.equals(currentEmployeeId)) {
                org.example.ams_be.dto.EmployeeDto targetEmp = employeeRepository.findById(employeeId).orElse(null);
                org.example.ams_be.dto.EmployeeDto currentEmp = employeeRepository.findById(currentEmployeeId).orElse(null);
                
                if (targetEmp == null || currentEmp == null || targetEmp.getDepartmentId() == null || 
                    !targetEmp.getDepartmentId().equals(currentEmp.getDepartmentId())) {
                    throw new org.springframework.web.server.ResponseStatusException(
                            org.springframework.http.HttpStatus.FORBIDDEN, "Access Denied: Target employee is not in your department"
                    );
                }
            }
        }

        Pageable pageable = PageRequest.of(page, size);
        return attendanceDailyService.employeeGetAttendance(employeeId, from, to, pageable);
    }

    @GetMapping("/me")
    public Page<AttendanceDailyResponse> myAttendance(
            @RequestParam LocalDate from,
            @RequestParam LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

        Long employeeId = principal.getEmployeeId();

        Pageable pageable = PageRequest.of(page, size);

        return attendanceDailyService.employeeGetAttendance(employeeId, from, to, pageable);
    }
}