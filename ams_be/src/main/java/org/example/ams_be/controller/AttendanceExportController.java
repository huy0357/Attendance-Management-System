package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.service.AttendanceExportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exports")
@RequiredArgsConstructor
public class AttendanceExportController {

    private final AttendanceExportService attendanceExportService;

    @GetMapping("/attendance-monthly")
    public ResponseEntity<byte[]> exportAttendanceMonthly(@RequestParam String month) {
        byte[] fileBytes = attendanceExportService.exportMonthlySummary(month);
        String fileName = "attendance_monthly_" + month + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName)
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(fileBytes);
    }

    @GetMapping("/attendance-employee-daily")
    public ResponseEntity<byte[]> exportEmployeeAttendanceDaily(
            @RequestParam String month,
            @RequestParam Long employeeId) {
        byte[] fileBytes = attendanceExportService.exportEmployeeDaily(month, employeeId);
        String fileName = "attendance_daily_" + employeeId + "_" + month + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName)
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(fileBytes);
    }

}