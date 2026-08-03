package org.example.ams_be.service.batch;

import org.example.ams_be.dto.AttendanceCalculationResult;
import org.example.ams_be.dto.EmployeeLogSummary;
import org.example.ams_be.entity.EmployeeSchedule;
import org.example.ams_be.entity.ShiftTemplate;
import org.example.ams_be.enums.AttendanceCalcStatus;
import org.example.ams_be.repository.ShiftTemplateRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceCalculationServiceTest {

    @Mock
    private ShiftTemplateRepository shiftTemplateRepository;

    @InjectMocks
    private AttendanceCalculationService attendanceCalculationService;

    @Test
    void calculateAttendanceReturnsAbsentWhenScheduleIsNull() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        Map<Long, EmployeeSchedule> schedules = new HashMap<>();
        schedules.put(1L, null);

        List<AttendanceCalculationResult> results = attendanceCalculationService.calculateAttendance(
                List.of(),
                schedules,
                processDate
        );

        assertEquals(1, results.size());
        AttendanceCalculationResult result = results.get(0);
        assertEquals(1L, result.getEmployeeId());
        assertEquals(processDate, result.getWorkDate());
        assertEquals(AttendanceCalcStatus.ABSENT, result.getStatus());
        assertEquals("No schedule found", result.getNote());
        assertEquals(0, result.getLateMinutes());
        assertEquals(0, result.getEarlyLeaveMinutes());
        assertEquals(0.0, result.getWorkingHours());
        assertFalse(result.getIsNightShift());
        assertFalse(result.isRequestApplied());
        verifyNoInteractions(shiftTemplateRepository);
    }

    @Test
    void calculateAttendanceReturnsAbsentWhenShiftTemplateMissing() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        EmployeeSchedule schedule = schedule(1L, 10L);
        when(shiftTemplateRepository.findById(10L)).thenReturn(Optional.empty());

        List<AttendanceCalculationResult> results = attendanceCalculationService.calculateAttendance(
                List.of(logSummary(1L, entry("IN", processDate.atTime(8, 0)))),
                Map.of(1L, schedule),
                processDate
        );

        AttendanceCalculationResult result = results.get(0);
        assertEquals(AttendanceCalcStatus.ABSENT, result.getStatus());
        assertEquals("Shift template not found", result.getNote());
        assertEquals(0, result.getLateMinutes());
        assertEquals(0, result.getEarlyLeaveMinutes());
        assertEquals(0.0, result.getWorkingHours());
        assertFalse(result.getIsNightShift());
        verify(shiftTemplateRepository).findById(10L);
    }

    @Test
    void calculateAttendanceReturnsMissingLogWhenNoLogEntriesExist() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        EmployeeSchedule schedule = schedule(1L, 10L);
        when(shiftTemplateRepository.findById(10L)).thenReturn(Optional.of(dayShift(10L)));

        List<AttendanceCalculationResult> results = attendanceCalculationService.calculateAttendance(
                List.of(logSummary(1L)),
                Map.of(1L, schedule),
                processDate
        );

        AttendanceCalculationResult result = results.get(0);
        assertEquals(AttendanceCalcStatus.MISSING_LOG, result.getStatus());
        assertEquals("No log entries found", result.getNote());
        assertEquals(10L, result.getShiftId());
        assertEquals(LocalTime.of(8, 0), result.getScheduledStartTime());
        assertEquals(LocalTime.of(17, 0), result.getScheduledEndTime());
        assertFalse(result.getIsNightShift());
    }

    @Test
    void calculateAttendanceReturnsMissingLogWhenLogEntriesAreNull() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        EmployeeSchedule schedule = schedule(1L, 10L);
        when(shiftTemplateRepository.findById(10L)).thenReturn(Optional.of(dayShift(10L)));

        List<AttendanceCalculationResult> results = attendanceCalculationService.calculateAttendance(
                List.of(logSummaryWithNullEntries(1L)),
                Map.of(1L, schedule),
                processDate
        );

        AttendanceCalculationResult result = results.get(0);
        assertEquals(AttendanceCalcStatus.MISSING_LOG, result.getStatus());
        assertEquals("No log entries found", result.getNote());
    }

    @Test
    void calculateAttendanceReturnsAbsentWhenBothCheckInAndCheckOutMissing() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        EmployeeSchedule schedule = schedule(1L, 10L);
        when(shiftTemplateRepository.findById(10L)).thenReturn(Optional.of(dayShift(10L)));

        List<AttendanceCalculationResult> results = attendanceCalculationService.calculateAttendance(
                List.of(logSummary(1L, entry("BREAK", processDate.atTime(12, 0)))),
                Map.of(1L, schedule),
                processDate
        );

        AttendanceCalculationResult result = results.get(0);
        assertEquals(AttendanceCalcStatus.ABSENT, result.getStatus());
        assertEquals("Absent - no logs found", result.getNote());
        assertNull(result.getActualCheckIn());
        assertNull(result.getActualCheckOut());
        assertEquals(0.0, result.getWorkingHours());
    }

    @Test
    void calculateAttendanceReturnsMissingLogWhenCheckInMissing() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        EmployeeSchedule schedule = schedule(1L, 10L);
        when(shiftTemplateRepository.findById(10L)).thenReturn(Optional.of(dayShift(10L)));

        List<AttendanceCalculationResult> results = attendanceCalculationService.calculateAttendance(
                List.of(logSummary(1L, entry("OUT", processDate.atTime(17, 30)))),
                Map.of(1L, schedule),
                processDate
        );

        AttendanceCalculationResult result = results.get(0);
        assertEquals(AttendanceCalcStatus.MISSING_LOG, result.getStatus());
        assertEquals("Missing check-in", result.getNote());
        assertNull(result.getActualCheckIn());
        assertEquals(processDate.atTime(17, 30), result.getActualCheckOut());
    }

    @Test
    void calculateAttendanceReturnsMissingLogWhenCheckOutMissing() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        EmployeeSchedule schedule = schedule(1L, 10L);
        when(shiftTemplateRepository.findById(10L)).thenReturn(Optional.of(dayShift(10L)));

        List<AttendanceCalculationResult> results = attendanceCalculationService.calculateAttendance(
                List.of(logSummary(1L, entry("IN", processDate.atTime(8, 0)))),
                Map.of(1L, schedule),
                processDate
        );

        AttendanceCalculationResult result = results.get(0);
        assertEquals(AttendanceCalcStatus.MISSING_LOG, result.getStatus());
        assertEquals("Missing check-out", result.getNote());
        assertEquals(processDate.atTime(8, 0), result.getActualCheckIn());
        assertNull(result.getActualCheckOut());
    }

    @Test
    void calculateAttendanceCalculatesLateAndEarlyLeaveUsingFirstInAndLastOut() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        EmployeeSchedule schedule = schedule(1L, 10L);
        when(shiftTemplateRepository.findById(10L)).thenReturn(Optional.of(dayShift(10L)));

        List<AttendanceCalculationResult> results = attendanceCalculationService.calculateAttendance(
                List.of(logSummary(
                        1L,
                        entry("IN", processDate.atTime(8, 20)),
                        entry("IN", processDate.atTime(8, 10)),
                        entry("OUT", processDate.atTime(16, 30)),
                        entry("OUT", processDate.atTime(16, 45))
                )),
                Map.of(1L, schedule),
                processDate
        );

        AttendanceCalculationResult result = results.get(0);
        assertEquals(AttendanceCalcStatus.LATE, result.getStatus());
        assertEquals(10, result.getLateMinutes());
        assertEquals(15, result.getEarlyLeaveMinutes());
        assertEquals("Late 10 minutes. Early leave 15 minutes.", result.getNote());
        assertEquals(processDate.atTime(8, 10), result.getActualCheckIn());
        assertEquals(processDate.atTime(16, 45), result.getActualCheckOut());
        assertEquals(7.58, result.getWorkingHours(), 0.01);
    }

    @Test
    void calculateAttendanceCalculatesPresentWorkingHoursForNormalShift() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        EmployeeSchedule schedule = schedule(1L, 10L);
        when(shiftTemplateRepository.findById(10L)).thenReturn(Optional.of(dayShift(10L)));

        List<AttendanceCalculationResult> results = attendanceCalculationService.calculateAttendance(
                List.of(logSummary(
                        1L,
                        entry("IN", processDate.atTime(8, 0)),
                        entry("OUT", processDate.atTime(17, 0))
                )),
                Map.of(1L, schedule),
                processDate
        );

        AttendanceCalculationResult result = results.get(0);
        assertEquals(AttendanceCalcStatus.PRESENT, result.getStatus());
        assertEquals(0, result.getLateMinutes());
        assertEquals(0, result.getEarlyLeaveMinutes());
        assertEquals("", result.getNote());
        assertEquals(8.0, result.getWorkingHours());
        assertFalse(result.getIsNightShift());
    }

    @Test
    void calculateAttendanceCalculatesEarlyLeaveOnly() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        EmployeeSchedule schedule = schedule(1L, 10L);
        when(shiftTemplateRepository.findById(10L)).thenReturn(Optional.of(dayShift(10L)));

        List<AttendanceCalculationResult> results = attendanceCalculationService.calculateAttendance(
                List.of(logSummary(
                        1L,
                        entry("IN", processDate.atTime(8, 0)),
                        entry("OUT", processDate.atTime(16, 30))
                )),
                Map.of(1L, schedule),
                processDate
        );

        AttendanceCalculationResult result = results.get(0);
        assertEquals(AttendanceCalcStatus.EARLY_LEAVE, result.getStatus());
        assertEquals(0, result.getLateMinutes());
        assertEquals(30, result.getEarlyLeaveMinutes());
        assertEquals("Early leave 30 minutes.", result.getNote());
    }

    @Test
    void calculateAttendanceUsesZeroBreakWhenShiftBreakMissing() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        EmployeeSchedule schedule = schedule(1L, 10L);
        when(shiftTemplateRepository.findById(10L)).thenReturn(Optional.of(dayShiftWithoutBreak(10L)));

        List<AttendanceCalculationResult> results = attendanceCalculationService.calculateAttendance(
                List.of(logSummary(
                        1L,
                        entry("IN", processDate.atTime(8, 0)),
                        entry("OUT", processDate.atTime(17, 30))
                )),
                Map.of(1L, schedule),
                processDate
        );

        AttendanceCalculationResult result = results.get(0);
        assertEquals(AttendanceCalcStatus.PRESENT, result.getStatus());
        assertEquals(9.5, result.getWorkingHours());
        assertEquals("", result.getNote());
    }

    @Test
    void calculateAttendanceClampsWorkingHoursToZeroWhenBreakExceedsWorkedTime() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        EmployeeSchedule schedule = schedule(1L, 10L);
        when(shiftTemplateRepository.findById(10L)).thenReturn(Optional.of(dayShiftWithBreak(10L, 600)));

        List<AttendanceCalculationResult> results = attendanceCalculationService.calculateAttendance(
                List.of(logSummary(
                        1L,
                        entry("IN", processDate.atTime(8, 0)),
                        entry("OUT", processDate.atTime(9, 0))
                )),
                Map.of(1L, schedule),
                processDate
        );

        AttendanceCalculationResult result = results.get(0);
        assertEquals(AttendanceCalcStatus.EARLY_LEAVE, result.getStatus());
        assertEquals(0.0, result.getWorkingHours());
        assertEquals(480, result.getEarlyLeaveMinutes());
    }

    @Test
    void calculateAttendanceSupportsNightShiftWithoutCrossingMidnight() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        EmployeeSchedule schedule = schedule(2L, 20L);
        when(shiftTemplateRepository.findById(20L)).thenReturn(Optional.of(nightShiftSameDay(20L)));

        List<AttendanceCalculationResult> results = attendanceCalculationService.calculateAttendance(
                List.of(logSummary(
                        2L,
                        entry("IN", processDate.atTime(18, 0)),
                        entry("OUT", processDate.atTime(22, 0))
                )),
                Map.of(2L, schedule),
                processDate
        );

        AttendanceCalculationResult result = results.get(0);
        assertEquals(AttendanceCalcStatus.PRESENT, result.getStatus());
        assertTrue(result.getIsNightShift());
        assertEquals(3.0, result.getWorkingHours());
    }

    @Test
    void calculateAttendanceSupportsNightShiftAcrossMidnight() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        EmployeeSchedule schedule = schedule(2L, 20L);
        when(shiftTemplateRepository.findById(20L)).thenReturn(Optional.of(nightShift(20L)));

        List<AttendanceCalculationResult> results = attendanceCalculationService.calculateAttendance(
                List.of(logSummary(
                        2L,
                        entry("IN", processDate.atTime(22, 15)),
                        entry("OUT", processDate.plusDays(1).atTime(5, 30))
                )),
                Map.of(2L, schedule),
                processDate
        );

        AttendanceCalculationResult result = results.get(0);
        assertEquals(AttendanceCalcStatus.LATE, result.getStatus());
        assertEquals(15, result.getLateMinutes());
        assertEquals(30, result.getEarlyLeaveMinutes());
        assertEquals(6.25, result.getWorkingHours(), 0.01);
        assertTrue(result.getIsNightShift());
    }

    @Test
    void calculateAttendanceUsesFirstLogSummaryWhenDuplicateEmployeeIdsExist() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        EmployeeSchedule schedule = schedule(1L, 10L);
        when(shiftTemplateRepository.findById(10L)).thenReturn(Optional.of(dayShift(10L)));

        List<AttendanceCalculationResult> results = attendanceCalculationService.calculateAttendance(
                List.of(
                        logSummary(1L, entry("IN", processDate.atTime(8, 0)), entry("OUT", processDate.atTime(17, 0))),
                        logSummary(1L, entry("IN", processDate.atTime(9, 0)), entry("OUT", processDate.atTime(15, 0)))
                ),
                Map.of(1L, schedule),
                processDate
        );

        AttendanceCalculationResult result = results.get(0);
        assertEquals(processDate.atTime(8, 0), result.getActualCheckIn());
        assertEquals(processDate.atTime(17, 0), result.getActualCheckOut());
        assertEquals(AttendanceCalcStatus.PRESENT, result.getStatus());
        verify(shiftTemplateRepository, times(1)).findById(10L);
    }

    private EmployeeSchedule schedule(Long employeeId, Long shiftId) {
        return EmployeeSchedule.builder()
                .employeeId(employeeId)
                .shiftId(shiftId)
                .workDate(LocalDate.of(2026, 3, 18))
                .scheduleSource(EmployeeSchedule.ScheduleSource.MANUAL)
                .build();
    }

    private ShiftTemplate dayShift(Long shiftId) {
        return ShiftTemplate.builder()
                .shiftId(shiftId)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(17, 0))
                .breakMinutes(60)
                .isNightShift(false)
                .build();
    }

    private ShiftTemplate dayShiftWithoutBreak(Long shiftId) {
        return ShiftTemplate.builder()
                .shiftId(shiftId)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(17, 0))
                .breakMinutes(null)
                .isNightShift(false)
                .build();
    }

    private ShiftTemplate dayShiftWithBreak(Long shiftId, Integer breakMinutes) {
        return ShiftTemplate.builder()
                .shiftId(shiftId)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(17, 0))
                .breakMinutes(breakMinutes)
                .isNightShift(false)
                .build();
    }

    private ShiftTemplate nightShift(Long shiftId) {
        return ShiftTemplate.builder()
                .shiftId(shiftId)
                .startTime(LocalTime.of(22, 0))
                .endTime(LocalTime.of(6, 0))
                .breakMinutes(60)
                .isNightShift(true)
                .build();
    }

    private ShiftTemplate nightShiftSameDay(Long shiftId) {
        return ShiftTemplate.builder()
                .shiftId(shiftId)
                .startTime(LocalTime.of(18, 0))
                .endTime(LocalTime.of(22, 0))
                .breakMinutes(60)
                .isNightShift(true)
                .build();
    }

    private EmployeeLogSummary logSummary(Long employeeId, EmployeeLogSummary.LogEntry... entries) {
        return EmployeeLogSummary.builder()
                .employeeId(employeeId)
                .logEntries(entries == null ? null : List.of(entries))
                .build();
    }

    private EmployeeLogSummary logSummaryWithNullEntries(Long employeeId) {
        return EmployeeLogSummary.builder()
                .employeeId(employeeId)
                .logEntries(null)
                .build();
    }

    private EmployeeLogSummary.LogEntry entry(String type, LocalDateTime timestamp) {
        return EmployeeLogSummary.LogEntry.builder()
                .eventType(type)
                .timestamp(timestamp)
                .build();
    }
}
