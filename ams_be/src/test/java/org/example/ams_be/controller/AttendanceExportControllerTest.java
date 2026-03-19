package org.example.ams_be.controller;

import org.example.ams_be.service.AttendanceExportService;
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
class AttendanceExportControllerTest {

    @Mock
    private AttendanceExportService attendanceExportService;

    @InjectMocks
    private AttendanceExportController controller;

    @Test
    void exportAttendanceMonthlyReturnsAttachmentResponse() {
        byte[] bytes = new byte[] {1, 2, 3};
        when(attendanceExportService.exportMonthlySummary("2026-03")).thenReturn(bytes);

        ResponseEntity<byte[]> response = controller.exportAttendanceMonthly("2026-03");

        assertEquals(200, response.getStatusCode().value());
        assertArrayEquals(bytes, response.getBody());
        assertEquals("attachment; filename=attendance_monthly_2026-03.xlsx",
                response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
    }
}
