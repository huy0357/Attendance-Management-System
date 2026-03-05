package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.service.batch.AttendanceBatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/attendance")
public class AdminAttendanceBatchController {

    private final AttendanceBatchService attendanceBatchService;

    // POST /api/admin/attendance/run-batch?date=2026-02-25
    @PostMapping("/run-batch")
    public ResponseEntity<?> runBatch(@RequestParam LocalDate date) {
        attendanceBatchService.processAttendanceForDate(date);
        return ResponseEntity.ok(Map.of(
                "message", "Attendance batch completed",
                "date", date.toString()
        ));
    }
}