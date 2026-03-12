package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ams_be.dto.MonthlyAttendanceEmailDto;
import org.example.ams_be.repository.AttendanceSummaryMonthlyRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceEmailService {

    private final AttendanceSummaryMonthlyRepository attendanceSummaryMonthlyRepository;
    private final EmailService emailService;

    public void sendMonthlyAttendanceEmail(String monthKey, Long employeeId) {
        MonthlyAttendanceEmailDto summary = attendanceSummaryMonthlyRepository
                .findEmailSummaryByMonthAndEmployee(monthKey, employeeId)
                .orElseThrow(() -> new RuntimeException(
                        "Monthly summary not found for employeeId=" + employeeId + ", month=" + monthKey));

        if (summary.getEmail() == null || summary.getEmail().isBlank()) {
            throw new RuntimeException("Employee has no email: " + employeeId);
        }

        String subject = "Thong bao tong hop cham cong thang " + monthKey;
        String html = buildAttendanceEmailHtml(summary);

        emailService.sendHtmlEmail(summary.getEmail(), subject, html);
    }

    public void sendMonthlyAttendanceEmailToAll(String monthKey) {
        List<MonthlyAttendanceEmailDto> summaries =
                attendanceSummaryMonthlyRepository.findAllEmailSummaryByMonth(monthKey);

        for (MonthlyAttendanceEmailDto summary : summaries) {
            try {
                String subject = "Thong bao tong hop cham cong thang " + monthKey;
                String html = buildAttendanceEmailHtml(summary);
                emailService.sendHtmlEmail(summary.getEmail(), subject, html);
                log.info("Sent attendance email to employeeId={}, email={}", summary.getEmployeeId(), summary.getEmail());
            } catch (Exception e) {
                log.error("Failed to send attendance email to employeeId={}, email={}, error={}",
                        summary.getEmployeeId(), summary.getEmail(), e.getMessage(), e);
            }
        }
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
                    <title>Thong bao cham cong</title>
                </head>
                <body style="font-family: Arial, sans-serif; color: #333; background: #f7f7f7; padding: 24px;">
                    <div style="max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #ddd; padding: 24px; border-radius: 10px;">
                        <h2 style="margin-top: 0;">Thong bao tong hop cham cong thang %s</h2>

                        <p>Xin chao <b>%s</b> (%s),</p>
                        <p>Duoi day la thong tin cham cong cua ban trong thang <b>%s</b>.</p>

                        <table style="width: 100%%; border-collapse: collapse; margin-top: 16px;">
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px;"><b>So ngay cong</b></td>
                                <td style="border: 1px solid #ddd; padding: 10px;">%s</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px;"><b>So ngay nghi phep</b></td>
                                <td style="border: 1px solid #ddd; padding: 10px;">%s</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px;"><b>So ngay vang</b></td>
                                <td style="border: 1px solid #ddd; padding: 10px;">%s</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px;"><b>Tong so phut di muon</b></td>
                                <td style="border: 1px solid #ddd; padding: 10px;">%d phut</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px;"><b>Tong so phut OT</b></td>
                                <td style="border: 1px solid #ddd; padding: 10px;">%d phut</td>
                            </tr>
                        </table>

                        <p style="margin-top: 20px;">
                            Vui long dang nhap he thong de kiem tra chi tiet neu can. Neu du lieu co sai sot, hay lien he HR hoac admin.
                        </p>

                        <p>Tran trong.</p>
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