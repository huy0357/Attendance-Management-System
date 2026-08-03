package org.example.ams_be.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ams_be.service.batch.AttendanceBatchService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;

@Component
@RequiredArgsConstructor
@Slf4j
public class AttendanceBatchScheduler {

    private final AttendanceBatchService attendanceBatchService;

    // FIX CA ĐÊM: Đổi giờ chạy từ 02:00 AM sang 12:30 PM trưa hàng ngày (sau khi ca đêm 22h-06h kết thúc hoàn toàn)
    @Scheduled(cron = "0 30 12 * * *")
    public void runDailyAttendanceBatch() {
        // FIX TIMEZONE: Đảm bảo lấy ngày theo múi giờ Việt Nam ICT
        LocalDate processDate = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(1);
        log.info("Running daily attendance batch for date: {}", processDate);
        attendanceBatchService.processAttendanceForDate(processDate);
    }
}