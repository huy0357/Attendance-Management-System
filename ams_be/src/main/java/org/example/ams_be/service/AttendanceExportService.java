package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.example.ams_be.dto.AttendanceEmployeeDailyExportDto;
import org.example.ams_be.dto.AttendanceMonthlyExportDto;
import org.example.ams_be.repository.AttendanceExportRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceExportService {

    private final AttendanceExportRepository attendanceExportRepository;

    public byte[] exportMonthlySummary(String monthKey) {
        validateMonthKey(monthKey);

        List<AttendanceMonthlyExportDto> data =
                attendanceExportRepository.findMonthlySummaryByMonth(monthKey);

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Attendance Monthly");

            CellStyle headerStyle = createHeaderStyle(workbook);
            int rowIdx = 0;

            Row titleRow = sheet.createRow(rowIdx++);
            titleRow.createCell(0).setCellValue("Attendance Monthly Summary - " + monthKey);

            Row headerRow = sheet.createRow(rowIdx++);
            String[] headers = {
                    "Month",
                    "Employee ID",
                    "Employee Code",
                    "Full Name",
                    "Email",
                    "Department ID",
                    "Work Days",
                    "Leave Days",
                    "Absent Days",
                    "Late Minutes",
                    "OT Minutes",
                    "Generated At"
            };

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

            for (AttendanceMonthlyExportDto item : data) {
                Row row = sheet.createRow(rowIdx++);
                int col = 0;

                row.createCell(col++).setCellValue(safe(item.getMonthKey()));
                row.createCell(col++).setCellValue(item.getEmployeeId() == null ? 0 : item.getEmployeeId());
                row.createCell(col++).setCellValue(safe(item.getEmployeeCode()));
                row.createCell(col++).setCellValue(safe(item.getFullName()));
                row.createCell(col++).setCellValue(safe(item.getEmail()));
                row.createCell(col++).setCellValue(item.getDepartmentId() == null ? 0 : item.getDepartmentId());
                row.createCell(col++).setCellValue(item.getWorkDays() == null ? 0 : item.getWorkDays().doubleValue());
                row.createCell(col++).setCellValue(item.getLeaveDays() == null ? 0 : item.getLeaveDays().doubleValue());
                row.createCell(col++).setCellValue(item.getAbsentDays() == null ? 0 : item.getAbsentDays().doubleValue());
                row.createCell(col++).setCellValue(item.getLateMinutes() == null ? 0 : item.getLateMinutes());
                row.createCell(col++).setCellValue(item.getOtMinutes() == null ? 0 : item.getOtMinutes());
                row.createCell(col).setCellValue(
                        item.getGeneratedAt() == null ? "" : item.getGeneratedAt().format(dateTimeFormatter)
                );
            }

            autosize(sheet, headers.length);
            workbook.write(out);
            return out.toByteArray();

        } catch (IOException e) {
            throw new RuntimeException("Failed to export monthly summary", e);
        }
    }

    public byte[] exportEmployeeDaily(String monthKey, Long employeeId) {
        validateMonthKey(monthKey);
        if (employeeId == null || employeeId <= 0) {
            throw new IllegalArgumentException("employeeId is invalid");
        }

        List<AttendanceEmployeeDailyExportDto> data =
                attendanceExportRepository.findEmployeeDailyByMonth(monthKey, employeeId);

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Employee Daily");

            CellStyle headerStyle = createHeaderStyle(workbook);
            int rowIdx = 0;

            String employeeInfo = data.isEmpty()
                    ? "Employee " + employeeId
                    : data.get(0).getFullName() + " (" + data.get(0).getEmployeeCode() + ")";

            Row titleRow = sheet.createRow(rowIdx++);
            titleRow.createCell(0).setCellValue("Attendance Daily - " + monthKey + " - " + employeeInfo);

            Row headerRow = sheet.createRow(rowIdx++);
            String[] headers = {
                    "Employee ID",
                    "Employee Code",
                    "Full Name",
                    "Email",
                    "Work Date",
                    "Shift ID",
                    "First In Time",
                    "Last Out Time",
                    "Work Minutes",
                    "Late Minutes",
                    "Early Leave Minutes",
                    "Break Minutes",
                    "OT Minutes Before",
                    "OT Minutes After",
                    "OT Minutes Holiday",
                    "Status"
            };

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

            for (AttendanceEmployeeDailyExportDto item : data) {
                Row row = sheet.createRow(rowIdx++);
                int col = 0;

                row.createCell(col++).setCellValue(item.getEmployeeId() == null ? 0 : item.getEmployeeId());
                row.createCell(col++).setCellValue(safe(item.getEmployeeCode()));
                row.createCell(col++).setCellValue(safe(item.getFullName()));
                row.createCell(col++).setCellValue(safe(item.getEmail()));
                row.createCell(col++).setCellValue(item.getWorkDate() == null ? "" : item.getWorkDate().format(dateFormatter));
                row.createCell(col++).setCellValue(item.getShiftId() == null ? 0 : item.getShiftId());
                row.createCell(col++).setCellValue(item.getFirstInTime() == null ? "" : item.getFirstInTime().format(dateTimeFormatter));
                row.createCell(col++).setCellValue(item.getLastOutTime() == null ? "" : item.getLastOutTime().format(dateTimeFormatter));
                row.createCell(col++).setCellValue(item.getWorkMinutes() == null ? 0 : item.getWorkMinutes());
                row.createCell(col++).setCellValue(item.getLateMinutes() == null ? 0 : item.getLateMinutes());
                row.createCell(col++).setCellValue(item.getEarlyLeaveMinutes() == null ? 0 : item.getEarlyLeaveMinutes());
                row.createCell(col++).setCellValue(item.getBreakMinutes() == null ? 0 : item.getBreakMinutes());
                row.createCell(col++).setCellValue(item.getOtMinutesBefore() == null ? 0 : item.getOtMinutesBefore());
                row.createCell(col++).setCellValue(item.getOtMinutesAfter() == null ? 0 : item.getOtMinutesAfter());
                row.createCell(col++).setCellValue(item.getOtMinutesHoliday() == null ? 0 : item.getOtMinutesHoliday());
                row.createCell(col).setCellValue(safe(item.getStatus()));
            }

            autosize(sheet, headers.length);
            workbook.write(out);
            return out.toByteArray();

        } catch (IOException e) {
            throw new RuntimeException("Failed to export employee daily attendance", e);
        }
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        return style;
    }

    private void autosize(Sheet sheet, int totalColumns) {
        for (int i = 0; i < totalColumns; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void validateMonthKey(String monthKey) {
        if (monthKey == null || !monthKey.matches("^\\d{4}-\\d{2}$")) {
            throw new IllegalArgumentException("month must be format yyyy-MM");
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}