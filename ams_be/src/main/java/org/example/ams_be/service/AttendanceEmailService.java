package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ams_be.dto.MonthlyAttendanceEmailDto;
import org.example.ams_be.repository.AttendanceSummaryMonthlyRepository;
import org.example.ams_be.entity.Account;
import org.example.ams_be.repository.AccountRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceEmailService {

    private final AttendanceSummaryMonthlyRepository attendanceSummaryMonthlyRepository;
    private final EmailService emailService;
    private final org.example.ams_be.repository.EmployeeRepository employeeRepository;
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

    public void sendMonthlyAttendanceEmail(String monthKey, Long employeeId) {
        MonthlyAttendanceEmailDto summary = attendanceSummaryMonthlyRepository
                .findEmailSummaryByMonthAndEmployee(monthKey, employeeId)
                .orElseGet(() -> buildFallbackSummary(monthKey, employeeId));

        if (summary.getEmail() == null || summary.getEmail().isBlank()) {
            throw new RuntimeException("Employee has no email: " + employeeId);
        }

        String subject = "Thông báo tổng hợp chấm công tháng " + monthKey;
        String html = buildAttendanceEmailHtml(summary);

        emailService.sendHtmlEmail(summary.getEmail(), subject, html);

        auditLogService.saveAuditLog(
                "SEND_EMAIL",
                "ATTENDANCE_EMAIL",
                employeeId,
                getCurrentActorId(),
                null,
                Map.of(
                        "month", monthKey,
                        "employeeId", employeeId,
                        "recipient", summary.getEmail(),
                        "subject", subject
                )
        );
    }

    public void sendMonthlyAttendanceEmailToAll(String monthKey) {
        List<org.example.ams_be.dto.EmployeeDto> allEmployees = employeeRepository.findAll();
        List<MonthlyAttendanceEmailDto> summaries =
                attendanceSummaryMonthlyRepository.findAllEmailSummaryByMonth(monthKey);

        java.util.Map<Long, MonthlyAttendanceEmailDto> summaryMap = summaries.stream()
                .collect(java.util.stream.Collectors.toMap(MonthlyAttendanceEmailDto::getEmployeeId, s -> s));

        int successCount = 0;
        int failCount = 0;

        for (org.example.ams_be.dto.EmployeeDto emp : allEmployees) {
            if ("INACTIVE".equalsIgnoreCase(emp.getStatus()) || emp.getEmail() == null || emp.getEmail().isBlank()) {
                continue;
            }

            MonthlyAttendanceEmailDto summary = summaryMap.get(emp.getEmployeeId());
            if (summary == null) {
                summary = MonthlyAttendanceEmailDto.builder()
                        .employeeId(emp.getEmployeeId())
                        .employeeCode(emp.getEmployeeCode())
                        .employeeName(emp.getFullName())
                        .email(emp.getEmail())
                        .monthKey(monthKey)
                        .workDays(BigDecimal.ZERO)
                        .leaveDays(BigDecimal.ZERO)
                        .absentDays(BigDecimal.ZERO)
                        .lateMinutes(0)
                        .otMinutes(0)
                        .build();
            }

            try {
                String subject = "Thông báo tổng hợp chấm công tháng " + monthKey;
                String html = buildAttendanceEmailHtml(summary);
                emailService.sendHtmlEmail(summary.getEmail(), subject, html);
                log.info("Sent attendance email to employeeId={}, email={}", summary.getEmployeeId(), summary.getEmail());
                successCount++;
            } catch (Exception e) {
                log.error("Failed to send attendance email to employeeId={}, email={}, error={}",
                        summary.getEmployeeId(), summary.getEmail(), e.getMessage(), e);
                failCount++;
            }
        }

        auditLogService.saveAuditLog(
                "SEND_EMAIL_ALL",
                "ATTENDANCE_EMAIL",
                null,
                getCurrentActorId(),
                null,
                Map.of(
                        "month", monthKey,
                        "successCount", successCount,
                        "failCount", failCount,
                        "totalEmployees", allEmployees.size()
                )
        );
    }

    private MonthlyAttendanceEmailDto buildFallbackSummary(String monthKey, Long employeeId) {
        org.example.ams_be.dto.EmployeeDto employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found: " + employeeId));
        return MonthlyAttendanceEmailDto.builder()
                .employeeId(employeeId)
                .employeeCode(employee.getEmployeeCode())
                .employeeName(employee.getFullName())
                .email(employee.getEmail())
                .monthKey(monthKey)
                .workDays(BigDecimal.ZERO)
                .leaveDays(BigDecimal.ZERO)
                .absentDays(BigDecimal.ZERO)
                .lateMinutes(0)
                .otMinutes(0)
                .build();
    }

    private String buildAttendanceEmailHtml(MonthlyAttendanceEmailDto summary) {
        BigDecimal workDays = defaultDecimal(summary.getWorkDays());
        BigDecimal leaveDays = defaultDecimal(summary.getLeaveDays());
        BigDecimal absentDays = defaultDecimal(summary.getAbsentDays());
        int lateMinutes = defaultInt(summary.getLateMinutes());
        int otMinutes = defaultInt(summary.getOtMinutes());

        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Thông báo chấm công</title>
                </head>
                <body style="font-family: Arial, sans-serif; color: #333; background: #f7f7f7; padding: 24px;">
                    <div style="max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #ddd; padding: 24px; border-radius: 10px;">
                        <h2 style="margin-top: 0;">Thông báo tổng hợp chấm công tháng %s</h2>

                        <p>Xin chào <b>%s</b> (%s),</p>
                        <p>Dưới đây là thông tin chấm công của bạn trong tháng <b>%s</b>.</p>

                        <table style="width: 100%%; border-collapse: collapse; margin-top: 16px;">
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px;"><b>Số ngày công</b></td>
                                <td style="border: 1px solid #ddd; padding: 10px;">%s</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px;"><b>Số ngày nghỉ phép</b></td>
                                <td style="border: 1px solid #ddd; padding: 10px;">%s</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px;"><b>Số ngày vắng</b></td>
                                <td style="border: 1px solid #ddd; padding: 10px;">%s</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px;"><b>Tổng số phút đi muộn</b></td>
                                <td style="border: 1px solid #ddd; padding: 10px;">%d phút</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px;"><b>Tổng số phút OT</b></td>
                                <td style="border: 1px solid #ddd; padding: 10px;">%d phút</td>
                            </tr>
                        </table>

                        <p style="margin-top: 20px;">
                            Vui lòng đăng nhập hệ thống để kiểm tra chi tiết nếu cần. Nếu dữ liệu có sai sót, hãy liên hệ HR hoặc admin.
                        </p>

                        <p>Trân trọng.</p>
                    </div>
                </body>
                </html>
                """.formatted(
                summary.getMonthKey(),
                safe(summary.getEmployeeName()),
                safe(summary.getEmployeeCode()),
                summary.getMonthKey(),
                workDays.stripTrailingZeros().toPlainString(),
                leaveDays.stripTrailingZeros().toPlainString(),
                absentDays.stripTrailingZeros().toPlainString(),
                lateMinutes,
                otMinutes
        );
    }

    private BigDecimal defaultDecimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private int defaultInt(Integer value) {
        return value == null ? 0 : value;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}