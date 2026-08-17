package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.entity.Account;
import org.example.ams_be.repository.AccountRepository;
import org.example.ams_be.repository.AttendanceSummaryMonthlyRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AttendanceMonthlySummaryService {

    private final AttendanceSummaryMonthlyRepository attendanceSummaryMonthlyRepository;
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

    public int generateMonthlySummary(String monthKey) {
        validateMonthKey(monthKey);
        int rows = attendanceSummaryMonthlyRepository.upsertByMonth(monthKey);

        auditLogService.saveAuditLog(
                "GENERATE_MONTHLY_SUMMARY",
                "ATTENDANCE_SUMMARY",
                null,
                getCurrentActorId(),
                null,
                Map.of("month", monthKey, "affectedRows", rows)
        );

        return rows;
    }   

    public int generateMonthlySummaryForOne(String monthKey, Long employeeId) {
        validateMonthKey(monthKey);
        if (employeeId == null || employeeId <= 0) {
            throw new IllegalArgumentException("employeeId is invalid");
        }
        int rows = attendanceSummaryMonthlyRepository.upsertByMonthAndEmployee(monthKey, employeeId);

        auditLogService.saveAuditLog(
                "GENERATE_MONTHLY_SUMMARY_ONE",
                "ATTENDANCE_SUMMARY",
                employeeId,
                getCurrentActorId(),
                null,
                Map.of("month", monthKey, "employeeId", employeeId, "affectedRows", rows)
        );

        return rows;
    }

    private void validateMonthKey(String monthKey) {
        if (monthKey == null || !monthKey.matches("^\\d{4}-\\d{2}$")) {
            throw new IllegalArgumentException("month must be format yyyy-MM");
        }
    }
}