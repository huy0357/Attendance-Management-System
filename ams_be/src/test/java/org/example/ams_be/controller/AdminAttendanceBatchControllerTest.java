package org.example.ams_be.controller;

import org.example.ams_be.service.batch.AttendanceBatchService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminAttendanceBatchControllerTest {

    @Mock
    private AttendanceBatchService attendanceBatchService;

    @InjectMocks
    private AdminAttendanceBatchController controller;

    @Test
    void runBatchDelegatesAndReturnsOk() {
        LocalDate date = LocalDate.of(2026, 3, 18);

        ResponseEntity<?> response = controller.runBatch(date);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(Map.of("message", "Attendance batch completed", "date", "2026-03-18"), response.getBody());
        verify(attendanceBatchService).processAttendanceForDate(date);
    }
}
