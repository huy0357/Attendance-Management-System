package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.service.batch.AttendanceBatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance-daily")
@RequiredArgsConstructor
public class AttendanceDailyBatchDebugController {

    private final AttendanceBatchService attendanceBatchService;

    // CHỈ DÙNG ĐỂ TEST - nhớ thêm @PreAuthorize hoặc xoá trước khi deploy production
    @PostMapping("/debug-run")
    public ResponseEntity<?> runForDate(@RequestParam String date) {
        LocalDate processDate = LocalDate.parse(date); // yyyy-MM-dd
        attendanceBatchService.processAttendanceForDate(processDate);
        return ResponseEntity.ok(Map.of("message", "processed", "date", date));
    }
}