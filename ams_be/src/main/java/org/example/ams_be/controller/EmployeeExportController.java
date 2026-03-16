package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.service.EmployeeExportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exports")
@RequiredArgsConstructor
public class EmployeeExportController {

    private final EmployeeExportService employeeExportService;

    @GetMapping("/employees")
    public ResponseEntity<byte[]> exportEmployees() {

        byte[] fileBytes = employeeExportService.exportEmployees();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=employees.xlsx")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(fileBytes);
    }
}