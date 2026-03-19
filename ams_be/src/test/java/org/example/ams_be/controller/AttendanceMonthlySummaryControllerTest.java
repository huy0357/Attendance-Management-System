package org.example.ams_be.controller;

import org.example.ams_be.service.AttendanceMonthlySummaryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceMonthlySummaryControllerTest {

    @Mock
    private AttendanceMonthlySummaryService attendanceMonthlySummaryService;

    @InjectMocks
    private AttendanceMonthlySummaryController controller;

    @Test
    void generateReturnsAffectedRows() {
        when(attendanceMonthlySummaryService.generateMonthlySummary("2026-03")).thenReturn(7);

        ResponseEntity<?> response = controller.generate("2026-03");

        assertEquals(200, response.getStatusCode().value());
        assertEquals(Map.of(
                "message", "Generate monthly summary successfully",
                "month", "2026-03",
                "affectedRows", 7
        ), response.getBody());
        verify(attendanceMonthlySummaryService).generateMonthlySummary("2026-03");
    }
}
