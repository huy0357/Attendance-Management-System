package org.example.ams_be.controller;

import org.example.ams_be.service.EmployeeExportService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeExportControllerTest {

    @Mock
    private EmployeeExportService employeeExportService;

    @InjectMocks
    private EmployeeExportController controller;

    @Test
    void exportEmployeesReturnsAttachmentResponse() {
        byte[] bytes = new byte[] {9, 8};
        when(employeeExportService.exportEmployees()).thenReturn(bytes);

        ResponseEntity<byte[]> response = controller.exportEmployees();

        assertEquals(200, response.getStatusCode().value());
        assertArrayEquals(bytes, response.getBody());
        assertEquals("attachment; filename=employees.xlsx",
                response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
    }
}
