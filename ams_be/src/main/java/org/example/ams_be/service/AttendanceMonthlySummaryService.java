package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.repository.AttendanceSummaryMonthlyRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AttendanceMonthlySummaryService {

    private final AttendanceSummaryMonthlyRepository attendanceSummaryMonthlyRepository;

    public int generateMonthlySummary(String monthKey) {
        validateMonthKey(monthKey);
        return attendanceSummaryMonthlyRepository.upsertByMonth(monthKey);
    }

    public int generateMonthlySummaryForOne(String monthKey, Long employeeId) {
        validateMonthKey(monthKey);
        if (employeeId == null || employeeId <= 0) {
            throw new IllegalArgumentException("employeeId is invalid");
        }
        return attendanceSummaryMonthlyRepository.upsertByMonthAndEmployee(monthKey, employeeId);
    }

    private void validateMonthKey(String monthKey) {
        if (monthKey == null || !monthKey.matches("^\\d{4}-\\d{2}$")) {
            throw new IllegalArgumentException("month must be format yyyy-MM");
        }
    }
}