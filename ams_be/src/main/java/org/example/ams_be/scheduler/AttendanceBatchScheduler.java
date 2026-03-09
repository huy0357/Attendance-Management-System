package org.example.ams_be.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ams_be.service.batch.AttendanceBatchService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class AttendanceBatchScheduler {

    private final AttendanceBatchService attendanceBatchService;

    // chạy mỗi ngày 02:00 sáng
    @Scheduled(cron = "0 0 2 * * *")
    public void runDailyAttendanceBatch() {

        LocalDate processDate = LocalDate.now().minusDays(1);

        log.info("Running daily attendance batch for {}", processDate);

        attendanceBatchService.processAttendanceForDate(processDate);
    }
}