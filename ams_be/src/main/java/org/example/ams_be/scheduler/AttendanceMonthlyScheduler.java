package org.example.ams_be.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ams_be.service.AttendanceEmailService;
import org.example.ams_be.service.AttendanceMonthlySummaryService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;

@Component
@RequiredArgsConstructor
@Slf4j
public class AttendanceMonthlyScheduler {

    private final AttendanceMonthlySummaryService attendanceMonthlySummaryService;
    private final AttendanceEmailService attendanceEmailService;

    @Scheduled(cron = "0 10 0 1 * *")
    public void generateAndSendMonthlyAttendanceEmail() {
        String monthKey = YearMonth.now().minusMonths(1).toString();

        try {
            log.info("Start generating monthly summary for month={}", monthKey);
            attendanceMonthlySummaryService.generateMonthlySummary(monthKey);

            log.info("Start sending monthly attendance emails for month={}", monthKey);
            attendanceEmailService.sendMonthlyAttendanceEmailToAll(monthKey);

            log.info("Finished monthly summary + email for month={}", monthKey);
        } catch (Exception e) {
            log.error("Monthly scheduler failed for month={}, error={}", monthKey, e.getMessage(), e);
        }
    }
}