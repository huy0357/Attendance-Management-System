package org.example.ams_be.service;

import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.example.ams_be.dto.EmployeeExportDto;
import org.example.ams_be.repository.EmployeeExportRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedConstruction;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mockConstruction;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeExportServiceTest {

    @Mock
    private EmployeeExportRepository employeeExportRepository;

    @InjectMocks
    private EmployeeExportService employeeExportService;

    @Test
    void exportEmployeesBuildsWorkbookWithHeadersAndData() throws Exception {
        when(employeeExportRepository.findAllEmployees()).thenReturn(List.of(
                EmployeeExportDto.builder()
                        .employeeId(1L)
                        .employeeCode("EMP001")
                        .fullName("Alice")
                        .dob(LocalDate.of(2000, 1, 1))
                        .gender("F")
                        .phone("0123456789")
                        .email("alice@company.com")
                        .status("ACTIVE")
                        .departmentId(10L)
                        .positionId(20L)
                        .managerId(30L)
                        .hireDate(LocalDate.of(2025, 1, 1))
                        .terminatedDate(null)
                        .createdAt(LocalDateTime.of(2025, 1, 1, 8, 0))
                        .build()
        ));

        byte[] bytes = employeeExportService.exportEmployees();

        assertTrue(bytes.length > 0);
        verify(employeeExportRepository).findAllEmployees();

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals("Employees", workbook.getSheetAt(0).getSheetName());
            assertEquals("Employee ID", workbook.getSheetAt(0).getRow(0).getCell(0).getStringCellValue());
            assertEquals("Full Name", workbook.getSheetAt(0).getRow(0).getCell(2).getStringCellValue());
            assertEquals(1L, (long) workbook.getSheetAt(0).getRow(1).getCell(0).getNumericCellValue());
            assertEquals("EMP001", workbook.getSheetAt(0).getRow(1).getCell(1).getStringCellValue());
            assertEquals("Alice", workbook.getSheetAt(0).getRow(1).getCell(2).getStringCellValue());
            assertEquals("2025-01-01T08:00", workbook.getSheetAt(0).getRow(1).getCell(13).getStringCellValue());
        }
    }

    @Test
    void exportEmployeesCreatesWorkbookWhenRepositoryReturnsEmpty() throws Exception {
        when(employeeExportRepository.findAllEmployees()).thenReturn(List.of());

        byte[] bytes = employeeExportService.exportEmployees();

        assertTrue(bytes.length > 0);
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals("Employees", workbook.getSheetAt(0).getSheetName());
            assertEquals(1, workbook.getSheetAt(0).getPhysicalNumberOfRows());
            assertEquals("Status", workbook.getSheetAt(0).getRow(0).getCell(7).getStringCellValue());
        }
    }

    @Test
    void exportEmployeesMapsNullFieldsToDefaultCellValues() throws Exception {
        when(employeeExportRepository.findAllEmployees()).thenReturn(List.of(
                EmployeeExportDto.builder()
                        .employeeId(2L)
                        .build()
        ));

        byte[] bytes = employeeExportService.exportEmployees();

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals(2L, (long) workbook.getSheetAt(0).getRow(1).getCell(0).getNumericCellValue());
            assertEquals("", workbook.getSheetAt(0).getRow(1).getCell(1).getStringCellValue());
            assertEquals("", workbook.getSheetAt(0).getRow(1).getCell(3).getStringCellValue());
            assertEquals(0L, (long) workbook.getSheetAt(0).getRow(1).getCell(8).getNumericCellValue());
            assertEquals("", workbook.getSheetAt(0).getRow(1).getCell(11).getStringCellValue());
            assertEquals("", workbook.getSheetAt(0).getRow(1).getCell(13).getStringCellValue());
        }
    }

    @Test
    void exportEmployeesWritesTerminatedDateWhenPresent() throws Exception {
        when(employeeExportRepository.findAllEmployees()).thenReturn(List.of(
                EmployeeExportDto.builder()
                        .employeeId(3L)
                        .terminatedDate(LocalDate.of(2026, 3, 15))
                        .build()
        ));

        byte[] bytes = employeeExportService.exportEmployees();

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals("2026-03-15", workbook.getSheetAt(0).getRow(1).getCell(12).getStringCellValue());
        }
    }

    @Test
    void exportEmployeesWrapsIOExceptionFromWorkbookWrite() throws Exception {
        when(employeeExportRepository.findAllEmployees()).thenReturn(List.of());

        try (MockedConstruction<XSSFWorkbook> mockedWorkbook = mockConstruction(
                XSSFWorkbook.class,
                (mock, context) -> {
                    XSSFWorkbook realWorkbook = new XSSFWorkbook();
                    doAnswer(invocation -> realWorkbook.createSheet(invocation.getArgument(0)))
                            .when(mock).createSheet(anyString());
                    doAnswer(invocation -> realWorkbook.createFont()).when(mock).createFont();
                    doAnswer(invocation -> realWorkbook.createCellStyle()).when(mock).createCellStyle();
                    doThrow(new IOException("write failed"))
                            .when(mock).write(org.mockito.ArgumentMatchers.any(java.io.OutputStream.class));
                    doAnswer(invocation -> {
                        realWorkbook.close();
                        return null;
                    }).when(mock).close();
                }
        )) {
            RuntimeException ex = assertThrows(RuntimeException.class, () -> employeeExportService.exportEmployees());

            assertEquals("Export employees failed", ex.getMessage());
            assertTrue(ex.getCause() instanceof IOException);
            assertEquals("write failed", ex.getCause().getMessage());
            assertEquals(1, mockedWorkbook.constructed().size());
        }
    }
}
