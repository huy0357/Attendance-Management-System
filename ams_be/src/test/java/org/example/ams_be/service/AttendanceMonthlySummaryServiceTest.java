package org.example.ams_be.service;

import org.example.ams_be.repository.AttendanceSummaryMonthlyRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceMonthlySummaryServiceTest {

    @Mock
    private AttendanceSummaryMonthlyRepository attendanceSummaryMonthlyRepository;

    @InjectMocks
    private AttendanceMonthlySummaryService attendanceMonthlySummaryService;

    @Test
    void generateMonthlySummaryCallsRepositoryWhenMonthKeyValid() {
        when(attendanceSummaryMonthlyRepository.upsertByMonth("2026-03")).thenReturn(5);

        int result = attendanceMonthlySummaryService.generateMonthlySummary("2026-03");

        assertEquals(5, result);
        verify(attendanceSummaryMonthlyRepository).upsertByMonth("2026-03");
    }

    @Test
    void generateMonthlySummaryThrowsWhenMonthKeyInvalid() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> attendanceMonthlySummaryService.generateMonthlySummary("2026/03")
        );

        assertEquals("month must be format yyyy-MM", ex.getMessage());
        verifyNoInteractions(attendanceSummaryMonthlyRepository);
    }

    @Test
    void generateMonthlySummaryForOneCallsRepositoryWhenInputsValid() {
        when(attendanceSummaryMonthlyRepository.upsertByMonthAndEmployee("2026-03", 7L)).thenReturn(1);

        int result = attendanceMonthlySummaryService.generateMonthlySummaryForOne("2026-03", 7L);

        assertEquals(1, result);
        verify(attendanceSummaryMonthlyRepository).upsertByMonthAndEmployee("2026-03", 7L);
    }

    @Test
    void generateMonthlySummaryForOneThrowsWhenMonthKeyInvalid() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> attendanceMonthlySummaryService.generateMonthlySummaryForOne(null, 7L)
        );

        assertEquals("month must be format yyyy-MM", ex.getMessage());
        verifyNoInteractions(attendanceSummaryMonthlyRepository);
    }

    @Test
    void generateMonthlySummaryForOneThrowsWhenEmployeeIdInvalid() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> attendanceMonthlySummaryService.generateMonthlySummaryForOne("2026-03", 0L)
        );

        assertEquals("employeeId is invalid", ex.getMessage());
        verifyNoInteractions(attendanceSummaryMonthlyRepository);
    }

    @Test
    void generateMonthlySummaryForOneThrowsWhenEmployeeIdIsNull() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> attendanceMonthlySummaryService.generateMonthlySummaryForOne("2026-03", null)
        );

        assertEquals("employeeId is invalid", ex.getMessage());
        verifyNoInteractions(attendanceSummaryMonthlyRepository);
    }
}
