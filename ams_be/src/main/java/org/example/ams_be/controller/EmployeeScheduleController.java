package org.example.ams_be.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.request.AssignShiftRangeRequest;
import org.example.ams_be.dto.response.EmployeeScheduleDayResponse;
import org.example.ams_be.service.EmployeeScheduleService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/schedules")
@RequiredArgsConstructor
public class EmployeeScheduleController {

    private final EmployeeScheduleService service;

    @PostMapping("/assign-range")
    public Map<String, Object> assignRange(@Valid @RequestBody AssignShiftRangeRequest req) {
        return service.assignRange(req);
    }
    @GetMapping("/by-employee/day")
    public List<EmployeeScheduleDayResponse> getByEmployeeDay(
            @RequestParam Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return service.getEmployeeScheduleByDay(employeeId, date);
    }

    @GetMapping("/by-range")
    public List<EmployeeScheduleDayResponse> getByRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return service.getEmployeeSchedulesByRange(startDate, endDate);
    }

    @DeleteMapping("/{scheduleId}")
    public Map<String, Object> deleteSchedule(@PathVariable Long scheduleId) {
        service.deleteSchedule(scheduleId);
        return Map.of("success", true, "deletedScheduleId", scheduleId);
    }

    @DeleteMapping("/by-employee/day")
    public Map<String, Object> deleteByEmployeeDay(
            @RequestParam Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        service.deleteScheduleByEmployeeAndDate(employeeId, date);
        return Map.of("success", true, "employeeId", employeeId, "date", date.toString());
    }
}
