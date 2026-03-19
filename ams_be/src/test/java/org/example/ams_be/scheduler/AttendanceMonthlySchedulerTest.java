package org.example.ams_be.scheduler;

import org.example.ams_be.service.AttendanceEmailService;
import org.example.ams_be.service.AttendanceMonthlySummaryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.YearMonth;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

@ExtendWith(MockitoExtension.class)
class AttendanceMonthlySchedulerTest {

    @Mock
    private AttendanceMonthlySummaryService attendanceMonthlySummaryService;

    @Mock
    private AttendanceEmailService attendanceEmailService;

    @InjectMocks
    private AttendanceMonthlyScheduler scheduler;

    @Test
    void generateAndSendMonthlyAttendanceEmailDelegatesToBothServices() {
        String monthKey = YearMonth.now().minusMonths(1).toString();

        scheduler.generateAndSendMonthlyAttendanceEmail();

        verify(attendanceMonthlySummaryService).generateMonthlySummary(monthKey);
        verify(attendanceEmailService).sendMonthlyAttendanceEmailToAll(monthKey);
    }

    @Test
    void generateAndSendMonthlyAttendanceEmailSwallowsServiceException() {
        String monthKey = YearMonth.now().minusMonths(1).toString();
        doThrow(new RuntimeException("mail failed"))
                .when(attendanceEmailService)
                .sendMonthlyAttendanceEmailToAll(monthKey);

        scheduler.generateAndSendMonthlyAttendanceEmail();

        verify(attendanceMonthlySummaryService).generateMonthlySummary(monthKey);
        verify(attendanceEmailService).sendMonthlyAttendanceEmailToAll(monthKey);
        verifyNoMoreInteractions(attendanceMonthlySummaryService, attendanceEmailService);
    }
}
