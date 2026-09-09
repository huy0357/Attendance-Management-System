package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.MonthlyAttendanceEmailDto;
import org.example.ams_be.repository.AttendanceSummaryMonthlyRepository;
import org.example.ams_be.security.UserPrincipal;
import org.example.ams_be.service.AttendanceMonthlySummaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/monthly-summary")
@RequiredArgsConstructor
public class AttendanceMonthlySummaryController {

    private final AttendanceMonthlySummaryService attendanceMonthlySummaryService;
    private final AttendanceSummaryMonthlyRepository attendanceSummaryMonthlyRepository;

    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestParam String month) {
        int affected = attendanceMonthlySummaryService.generateMonthlySummary(month);
        return ResponseEntity.ok(Map.of(
                "message", "Generate monthly summary successfully",
                "month", month,
                "affectedRows", affected
        ));
    }

    // MỚI — ADMIN/HR: xem summary toàn bộ nhân viên trong tháng
    // GET /api/monthly-summary/admin?month=2026-07
    @GetMapping("/admin")
    public List<MonthlyAttendanceEmailDto> adminGetSummary(@RequestParam String month) {
        List<MonthlyAttendanceEmailDto> list = attendanceSummaryMonthlyRepository.findAllSummaryByMonth(month);
        if (list == null || list.isEmpty()) {
            list = attendanceSummaryMonthlyRepository.findRealtimeSummaryByMonth(month);
        }
        return list;
    }

    // MỚI — xem summary 1 nhân viên cụ thể
    // GET /api/monthly-summary/employee/5?month=2026-07
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<?> employeeGetSummary(
            @PathVariable Long employeeId,
            @RequestParam String month
    ) {
        return attendanceSummaryMonthlyRepository.findEmailSummaryByMonthAndEmployee(month, employeeId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // MỚI — nhân viên tự xem summary tháng của mình
    // GET /api/monthly-summary/me?month=2026-07
    @GetMapping("/me")
    public ResponseEntity<?> mySummary(@RequestParam String month, Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        Long empId = principal.getEmployeeId();

        // 1. Thử lấy từ bảng snapshot attendance_summary_monthly trước
        Optional<MonthlyAttendanceEmailDto> summary = attendanceSummaryMonthlyRepository.findEmailSummaryByMonthAndEmployee(month, empId);

        // 2. Nếu chưa có (tháng hiện tại đang chạy dở), fallback tính realtime từ attendance_daily
        if (summary.isEmpty()) {
            summary = attendanceSummaryMonthlyRepository.findRealtimeSummaryByMonthAndEmployee(month, empId);
        }

        return summary.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}