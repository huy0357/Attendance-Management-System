package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.example.ams_be.dto.EmployeeExportDto;
import org.example.ams_be.repository.EmployeeExportRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeExportService {

    private final EmployeeExportRepository employeeExportRepository;

    public byte[] exportEmployees() {

        List<EmployeeExportDto> employees =
                employeeExportRepository.findAllEmployees();

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Employees");

            CellStyle headerStyle = createHeaderStyle(workbook);

            String[] headers = {
                    "Employee ID",
                    "Employee Code",
                    "Full Name",
                    "DOB",
                    "Gender",
                    "Phone",
                    "Email",
                    "Status",
                    "Department ID",
                    "Position ID",
                    "Manager ID",
                    "Hire Date",
                    "Terminated Date",
                    "Created At"
            };

            Row headerRow = sheet.createRow(0);

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;

            for (EmployeeExportDto e : employees) {

                Row row = sheet.createRow(rowIdx++);

                row.createCell(0).setCellValue(e.getEmployeeId());
                row.createCell(1).setCellValue(safe(e.getEmployeeCode()));
                row.createCell(2).setCellValue(safe(e.getFullName()));
                row.createCell(3).setCellValue(e.getDob() == null ? "" : e.getDob().toString());
                row.createCell(4).setCellValue(safe(e.getGender()));
                row.createCell(5).setCellValue(safe(e.getPhone()));
                row.createCell(6).setCellValue(safe(e.getEmail()));
                row.createCell(7).setCellValue(safe(e.getStatus()));
                row.createCell(8).setCellValue(e.getDepartmentId() == null ? 0 : e.getDepartmentId());
                row.createCell(9).setCellValue(e.getPositionId() == null ? 0 : e.getPositionId());
                row.createCell(10).setCellValue(e.getManagerId() == null ? 0 : e.getManagerId());
                row.createCell(11).setCellValue(e.getHireDate() == null ? "" : e.getHireDate().toString());
                row.createCell(12).setCellValue(e.getTerminatedDate() == null ? "" : e.getTerminatedDate().toString());
                row.createCell(13).setCellValue(e.getCreatedAt() == null ? "" : e.getCreatedAt().toString());
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);

            return out.toByteArray();

        } catch (IOException e) {
            throw new RuntimeException("Export employees failed", e);
        }
    }

    private CellStyle createHeaderStyle(Workbook workbook) {

        Font font = workbook.createFont();
        font.setBold(true);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);

        return style;
    }

    private String safe(String v) {
        return v == null ? "" : v;
    }
}