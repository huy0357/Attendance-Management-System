package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.service.AttendanceMonthlySummaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/monthly-summary")
@RequiredArgsConstructor
public class AttendanceMonthlySummaryController {

    private final AttendanceMonthlySummaryService attendanceMonthlySummaryService;

    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestParam String month) {
        int affected = attendanceMonthlySummaryService.generateMonthlySummary(month);
        return ResponseEntity.ok(Map.of(
                "message", "Generate monthly summary successfully",
                "month", month,
                "affectedRows", affected
        ));
    }

}