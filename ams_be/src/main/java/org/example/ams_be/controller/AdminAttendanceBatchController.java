package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.entity.Account;
import org.example.ams_be.repository.AccountRepository;
import org.example.ams_be.service.AuditLogService;
import org.example.ams_be.service.batch.AttendanceBatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/attendance")
public class AdminAttendanceBatchController {

    private final AttendanceBatchService attendanceBatchService;
    private final AuditLogService auditLogService;
    private final AccountRepository accountRepository;

    private Long getCurrentActorId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }

        return accountRepository.findByUsername(auth.getName())
                .map(Account::getEmployeeId)
                .orElse(null);
    }

    // POST /api/admin/attendance/run-batch?date=2026-02-25
    @PostMapping("/run-batch")
    public ResponseEntity<?> runBatch(@RequestParam LocalDate date) {
        attendanceBatchService.processAttendanceForDate(date);

        auditLogService.saveAuditLog(
                "RUN_BATCH",
                "ATTENDANCE_DAILY",
                null,
                getCurrentActorId(),
                null,
                Map.of("targetDate", date.toString())
        );

        return ResponseEntity.ok(Map.of(
                "message", "Attendance batch completed",
                "date", date.toString()
        ));
    }
}