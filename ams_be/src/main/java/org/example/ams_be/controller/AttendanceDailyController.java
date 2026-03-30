package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.example.ams_be.dto.response.AttendanceDailyResponse;
import org.example.ams_be.security.UserPrincipal;
import org.example.ams_be.service.AttendanceDailyService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/attendance-daily")
public class AttendanceDailyController {

    private final AttendanceDailyService attendanceDailyService;

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

    // EMPLOYEE: xem bảng công theo employeeId
    // GET /api/attendance-daily/employee/5?from=2026-02-01&to=2026-02-29&page=0&size=20
    @GetMapping("/employee/{employeeId}")
    public Page<AttendanceDailyResponse> employeeGetAttendance(
            @PathVariable Long employeeId,
            @RequestParam LocalDate from,
            @RequestParam LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
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