package org.example.ams_be.scheduler;

import org.example.ams_be.service.batch.AttendanceBatchService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AttendanceBatchSchedulerTest {

    @Mock
    private AttendanceBatchService attendanceBatchService;

    @InjectMocks
    private AttendanceBatchScheduler scheduler;

    @Test
    void runDailyAttendanceBatchUsesPreviousDay() {
        scheduler.runDailyAttendanceBatch();

        var dateCaptor = forClass(LocalDate.class);
        verify(attendanceBatchService).processAttendanceForDate(dateCaptor.capture());
        assertEquals(LocalDate.now().minusDays(1), dateCaptor.getValue());
    }
}
