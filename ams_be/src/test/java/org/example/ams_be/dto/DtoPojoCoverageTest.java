package org.example.ams_be.dto;

import org.junit.jupiter.api.Test;

import static org.example.ams_be.support.ModelCoverageAssertions.assertPojoCoverage;

class DtoPojoCoverageTest {

    @Test
    void dtoClassesCoverConstructorsAccessorsAndObjectMethods() {
        assertPojoCoverage(AccountDto.class);
        assertPojoCoverage(AttendanceCalculationResult.class);
        assertPojoCoverage(AttendanceEmployeeDailyExportDto.class);
        assertPojoCoverage(AttendanceMonthlyExportDto.class);
        assertPojoCoverage(DepartmentDto.class);
        assertPojoCoverage(EmployeeDto.class);
        assertPojoCoverage(EmployeeExportDto.class);
        assertPojoCoverage(EmployeeLogSummary.class);
        assertPojoCoverage(EmployeeLogSummary.LogEntry.class);
        assertPojoCoverage(MonthlyAttendanceEmailDto.class);
    }
}
