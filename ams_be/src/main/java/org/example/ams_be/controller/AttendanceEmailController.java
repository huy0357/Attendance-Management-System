package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.service.AttendanceEmailService;
import org.example.ams_be.service.AttendanceMonthlySummaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/attendance-email")
@RequiredArgsConstructor
public class AttendanceEmailController {

    private final AttendanceEmailService attendanceEmailService;
    private final AttendanceMonthlySummaryService attendanceMonthlySummaryService;

    @PostMapping("/send")
    public ResponseEntity<?> sendOne(
            @RequestParam String month,
            @RequestParam Long employeeId,
            @RequestParam(defaultValue = "false") boolean regenerate
    ) {
        if (regenerate) {
            attendanceMonthlySummaryService.generateMonthlySummaryForOne(month, employeeId);
        }

        attendanceEmailService.sendMonthlyAttendanceEmail(month, employeeId);

        return ResponseEntity.ok(Map.of(
                "message", "Send attendance email successfully",
                "month", month,
                "employeeId", employeeId
        ));
    }

    @PostMapping("/send-all")
    public ResponseEntity<?> sendAll(
            @RequestParam String month,
            @RequestParam(defaultValue = "false") boolean regenerate
    ) {
        if (regenerate) {
            attendanceMonthlySummaryService.generateMonthlySummary(month);
        }

        attendanceEmailService.sendMonthlyAttendanceEmailToAll(month);

        return ResponseEntity.ok(Map.of(
                "message", "Send attendance email to all employees successfully",
                "month", month
        ));
    }
}