package org.example.ams_be.service;

import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.example.ams_be.dto.AttendanceEmployeeDailyExportDto;
import org.example.ams_be.dto.AttendanceMonthlyExportDto;
import org.example.ams_be.repository.AttendanceExportRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceExportServiceTest {

    @Mock
    private AttendanceExportRepository attendanceExportRepository;

    @InjectMocks
    private AttendanceExportService attendanceExportService;

    @Test
    void exportMonthlySummaryThrowsWhenMonthKeyInvalid() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> attendanceExportService.exportMonthlySummary("2026/03")
        );

        assertEquals("month must be format yyyy-MM", ex.getMessage());
    }

    @Test
    void exportMonthlySummaryThrowsWhenMonthKeyNull() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> attendanceExportService.exportMonthlySummary(null)
        );

        assertEquals("month must be format yyyy-MM", ex.getMessage());
    }

    @Test
    void exportMonthlySummaryBuildsWorkbookWithHeadersAndData() throws Exception {
        when(attendanceExportRepository.findMonthlySummaryByMonth("2026-03"))
                .thenReturn(List.of(
                        AttendanceMonthlyExportDto.builder()
                                .monthKey("2026-03")
                                .employeeId(1L)
                                .employeeCode("EMP001")
                                .fullName("Alice")
                                .email("alice@company.com")
                                .departmentId(10L)
                                .workDays(BigDecimal.valueOf(20))
                                .leaveDays(BigDecimal.valueOf(2))
                                .absentDays(BigDecimal.valueOf(1))
                                .lateMinutes(15)
                                .otMinutes(120)
                                .generatedAt(LocalDateTime.of(2026, 3, 31, 18, 0))
                                .build()
                ));

        byte[] bytes = attendanceExportService.exportMonthlySummary("2026-03");

        assertNotNull(bytes);
        assertTrue(bytes.length > 0);
        verify(attendanceExportRepository).findMonthlySummaryByMonth("2026-03");

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals("Attendance Monthly", workbook.getSheetAt(0).getSheetName());
            assertEquals("Attendance Monthly Summary - 2026-03", workbook.getSheetAt(0).getRow(0).getCell(0).getStringCellValue());
            assertEquals("Month", workbook.getSheetAt(0).getRow(1).getCell(0).getStringCellValue());
            assertEquals("Employee ID", workbook.getSheetAt(0).getRow(1).getCell(1).getStringCellValue());
            assertEquals("2026-03", workbook.getSheetAt(0).getRow(2).getCell(0).getStringCellValue());
            assertEquals(1L, (long) workbook.getSheetAt(0).getRow(2).getCell(1).getNumericCellValue());
            assertEquals("Alice", workbook.getSheetAt(0).getRow(2).getCell(3).getStringCellValue());
            assertEquals("2026-03-31 18:00:00", workbook.getSheetAt(0).getRow(2).getCell(11).getStringCellValue());
        }
    }

    @Test
    void exportMonthlySummaryCreatesWorkbookWhenRepositoryReturnsEmpty() throws Exception {
        when(attendanceExportRepository.findMonthlySummaryByMonth("2026-03")).thenReturn(List.of());

        byte[] bytes = attendanceExportService.exportMonthlySummary("2026-03");

        assertTrue(bytes.length > 0);
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals(2, workbook.getSheetAt(0).getPhysicalNumberOfRows());
            assertEquals("Attendance Monthly Summary - 2026-03", workbook.getSheetAt(0).getRow(0).getCell(0).getStringCellValue());
        }
    }

    @Test
    void exportMonthlySummaryMapsNullFieldsToDefaultCellValues() throws Exception {
        when(attendanceExportRepository.findMonthlySummaryByMonth("2026-03"))
                .thenReturn(List.of(AttendanceMonthlyExportDto.builder().build()));

        byte[] bytes = attendanceExportService.exportMonthlySummary("2026-03");

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals("", workbook.getSheetAt(0).getRow(2).getCell(0).getStringCellValue());
            assertEquals(0L, (long) workbook.getSheetAt(0).getRow(2).getCell(1).getNumericCellValue());
            assertEquals("", workbook.getSheetAt(0).getRow(2).getCell(2).getStringCellValue());
            assertEquals(0L, (long) workbook.getSheetAt(0).getRow(2).getCell(5).getNumericCellValue());
            assertEquals(0D, workbook.getSheetAt(0).getRow(2).getCell(6).getNumericCellValue());
            assertEquals(0D, workbook.getSheetAt(0).getRow(2).getCell(10).getNumericCellValue());
            assertEquals("", workbook.getSheetAt(0).getRow(2).getCell(11).getStringCellValue());
        }
    }

    @Test
    void exportEmployeeDailyThrowsWhenMonthKeyInvalid() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> attendanceExportService.exportEmployeeDaily("2026/03", 1L)
        );

        assertEquals("month must be format yyyy-MM", ex.getMessage());
    }

    @Test
    void exportEmployeeDailyThrowsWhenEmployeeIdNull() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> attendanceExportService.exportEmployeeDaily("2026-03", null)
        );

        assertEquals("employeeId is invalid", ex.getMessage());
    }

    @Test
    void exportEmployeeDailyThrowsWhenEmployeeIdInvalid() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> attendanceExportService.exportEmployeeDaily("2026-03", 0L)
        );

        assertEquals("employeeId is invalid", ex.getMessage());
    }

    @Test
    void exportEmployeeDailyBuildsWorkbookWithHeadersAndData() throws Exception {
        when(attendanceExportRepository.findEmployeeDailyByMonth("2026-03", 1L))
                .thenReturn(List.of(
                        AttendanceEmployeeDailyExportDto.builder()
                                .employeeId(1L)
                                .employeeCode("EMP001")
                                .fullName("Alice")
                                .email("alice@company.com")
                                .workDate(LocalDate.of(2026, 3, 1))
                                .shiftId(5L)
                                .firstInTime(LocalDateTime.of(2026, 3, 1, 8, 0))
                                .lastOutTime(LocalDateTime.of(2026, 3, 1, 17, 0))
                                .workMinutes(480)
                                .lateMinutes(5)
                                .earlyLeaveMinutes(0)
                                .breakMinutes(60)
                                .otMinutesBefore(10)
                                .otMinutesAfter(20)
                                .otMinutesHoliday(0)
                                .status("PRESENT")
                                .build()
                ));

        byte[] bytes = attendanceExportService.exportEmployeeDaily("2026-03", 1L);

        assertTrue(bytes.length > 0);
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals("Employee Daily", workbook.getSheetAt(0).getSheetName());
            assertEquals("Attendance Daily - 2026-03 - Alice (EMP001)", workbook.getSheetAt(0).getRow(0).getCell(0).getStringCellValue());
            assertEquals("Employee ID", workbook.getSheetAt(0).getRow(1).getCell(0).getStringCellValue());
            assertEquals(1L, (long) workbook.getSheetAt(0).getRow(2).getCell(0).getNumericCellValue());
            assertEquals("2026-03-01", workbook.getSheetAt(0).getRow(2).getCell(4).getStringCellValue());
            assertEquals("PRESENT", workbook.getSheetAt(0).getRow(2).getCell(15).getStringCellValue());
        }
    }

    @Test
    void exportEmployeeDailyUsesFallbackTitleWhenRepositoryReturnsEmpty() throws Exception {
        when(attendanceExportRepository.findEmployeeDailyByMonth("2026-03", 9L)).thenReturn(List.of());

        byte[] bytes = attendanceExportService.exportEmployeeDaily("2026-03", 9L);

        assertTrue(bytes.length > 0);
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals("Attendance Daily - 2026-03 - Employee 9", workbook.getSheetAt(0).getRow(0).getCell(0).getStringCellValue());
            assertEquals(2, workbook.getSheetAt(0).getPhysicalNumberOfRows());
        }
    }

    @Test
    void exportEmployeeDailyMapsNullFieldsToDefaultCellValues() throws Exception {
        when(attendanceExportRepository.findEmployeeDailyByMonth("2026-03", 7L))
                .thenReturn(List.of(AttendanceEmployeeDailyExportDto.builder().build()));

        byte[] bytes = attendanceExportService.exportEmployeeDaily("2026-03", 7L);

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals("Attendance Daily - 2026-03 - null (null)", workbook.getSheetAt(0).getRow(0).getCell(0).getStringCellValue());
            assertEquals(0L, (long) workbook.getSheetAt(0).getRow(2).getCell(0).getNumericCellValue());
            assertEquals("", workbook.getSheetAt(0).getRow(2).getCell(1).getStringCellValue());
            assertEquals("", workbook.getSheetAt(0).getRow(2).getCell(4).getStringCellValue());
            assertEquals(0L, (long) workbook.getSheetAt(0).getRow(2).getCell(5).getNumericCellValue());
            assertEquals("", workbook.getSheetAt(0).getRow(2).getCell(6).getStringCellValue());
            assertEquals(0L, (long) workbook.getSheetAt(0).getRow(2).getCell(8).getNumericCellValue());
            assertEquals(0L, (long) workbook.getSheetAt(0).getRow(2).getCell(14).getNumericCellValue());
            assertEquals("", workbook.getSheetAt(0).getRow(2).getCell(15).getStringCellValue());
        }
    }
}
