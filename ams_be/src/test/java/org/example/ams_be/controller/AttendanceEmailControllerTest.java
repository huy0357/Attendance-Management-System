package org.example.ams_be.controller;

import org.example.ams_be.service.AttendanceEmailService;
import org.example.ams_be.service.AttendanceMonthlySummaryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class AttendanceEmailControllerTest {

    @Mock
    private AttendanceEmailService attendanceEmailService;

    @Mock
    private AttendanceMonthlySummaryService attendanceMonthlySummaryService;

    @InjectMocks
    private AttendanceEmailController controller;

    @Test
    void sendOneDelegatesWithoutRegeneration() {
        ResponseEntity<?> response = controller.sendOne("2026-03", 10L, false);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(Map.of(
                "message", "Send attendance email successfully",
                "month", "2026-03",
                "employeeId", 10L
        ), response.getBody());
        verify(attendanceEmailService).sendMonthlyAttendanceEmail("2026-03", 10L);
        verifyNoInteractions(attendanceMonthlySummaryService);
    }

    @Test
    void sendAllRegeneratesThenSends() {
        ResponseEntity<?> response = controller.sendAll("2026-03", true);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(Map.of(
                "message", "Send attendance email to all employees successfully",
                "month", "2026-03"
        ), response.getBody());
        verify(attendanceMonthlySummaryService).generateMonthlySummary("2026-03");
        verify(attendanceEmailService).sendMonthlyAttendanceEmailToAll("2026-03");
    }

    @Test
    void sendAllSkipsRegenerationWhenFlagFalse() {
        ResponseEntity<?> response = controller.sendAll("2026-03", false);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(Map.of(
                "message", "Send attendance email to all employees successfully",
                "month", "2026-03"
        ), response.getBody());
        verify(attendanceEmailService).sendMonthlyAttendanceEmailToAll("2026-03");
        verify(attendanceMonthlySummaryService, never()).generateMonthlySummary("2026-03");
    }

    @Test
    void sendOneRegeneratesWhenFlagTrue() {
        controller.sendOne("2026-03", 11L, true);

        verify(attendanceMonthlySummaryService).generateMonthlySummaryForOne("2026-03", 11L);
        verify(attendanceEmailService).sendMonthlyAttendanceEmail("2026-03", 11L);
    }
}
