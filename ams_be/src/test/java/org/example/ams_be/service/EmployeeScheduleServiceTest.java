package org.example.ams_be.service;

import org.example.ams_be.dto.request.AssignShiftRangeRequest;
import org.example.ams_be.dto.response.EmployeeScheduleDayResponse;
import org.example.ams_be.entity.EmployeeSchedule;
import org.example.ams_be.entity.ShiftTemplate;
import org.example.ams_be.repository.EmployeeScheduleRepository;
import org.example.ams_be.repository.ShiftTemplateRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeScheduleServiceTest {

    @Mock
    private EmployeeScheduleRepository scheduleRepo;

    @Mock
    private ShiftTemplateRepository shiftRepo;

    @InjectMocks
    private EmployeeScheduleService employeeScheduleService;

    @Test
    void assignRangeThrowsWhenEndDateBeforeStartDate() {
        AssignShiftRangeRequest request = request();
        request.setStartDate(LocalDate.of(2026, 3, 20));
        request.setEndDate(LocalDate.of(2026, 3, 18));

        assertThrows(RuntimeException.class, () -> employeeScheduleService.assignRange(request));
    }

    @Test
    void assignRangeThrowsWhenShiftDoesNotExist() {
        AssignShiftRangeRequest request = request();
        when(shiftRepo.findById(10L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> employeeScheduleService.assignRange(request));

        assertEquals("Shift not found", ex.getMessage());
    }

    @Test
    void assignRangeCreatesSchedulesAcrossDateRangeWhenNoConflict() {
        AssignShiftRangeRequest request = request();
        request.setEndDate(LocalDate.of(2026, 3, 19));
        when(shiftRepo.findById(10L)).thenReturn(Optional.of(dayShift(10L, 8, 17)));
        when(scheduleRepo.findByEmployeeIdAndWorkDateBetween(1L, LocalDate.of(2026, 3, 17), LocalDate.of(2026, 3, 20)))
                .thenReturn(List.of());
        when(scheduleRepo.save(any(EmployeeSchedule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, Object> result = employeeScheduleService.assignRange(request);

        assertEquals(2, result.get("created"));
        assertEquals(0, result.get("updated"));
        verify(scheduleRepo, times(2)).save(any(EmployeeSchedule.class));
    }

    @Test
    void assignRangeUpdatesExistingScheduleWhenOverwriteEnabled() {
        AssignShiftRangeRequest request = request();
        EmployeeSchedule existing = EmployeeSchedule.builder()
                .scheduleId(100L)
                .employeeId(1L)
                .workDate(LocalDate.of(2026, 3, 18))
                .shiftId(99L)
                .scheduleSource(EmployeeSchedule.ScheduleSource.IMPORT)
                .note("old")
                .build();

        when(shiftRepo.findById(10L)).thenReturn(Optional.of(dayShift(10L, 8, 17)));
        when(shiftRepo.findById(99L)).thenReturn(Optional.of(dayShift(99L, 0, 6)));
        when(scheduleRepo.findByEmployeeIdAndWorkDateBetween(1L, LocalDate.of(2026, 3, 17), LocalDate.of(2026, 3, 19)))
                .thenReturn(List.of(existing));
        when(scheduleRepo.save(existing)).thenReturn(existing);

        Map<String, Object> result = employeeScheduleService.assignRange(request);

        assertEquals(0, result.get("created"));
        assertEquals(1, result.get("updated"));
        assertEquals(10L, existing.getShiftId());
        assertEquals(EmployeeSchedule.ScheduleSource.MANUAL, existing.getScheduleSource());
        assertEquals("note", existing.getNote());
    }

    @Test
    void assignRangeCreatesNewScheduleWhenOverwriteDisabledAndSameDayExistingDoesNotConflict() {
        AssignShiftRangeRequest request = request();
        request.setOverwrite(false);
        EmployeeSchedule existing = EmployeeSchedule.builder()
                .scheduleId(101L)
                .employeeId(1L)
                .workDate(LocalDate.of(2026, 3, 18))
                .shiftId(99L)
                .build();

        when(shiftRepo.findById(10L)).thenReturn(Optional.of(dayShift(10L, 8, 17)));
        when(shiftRepo.findById(99L)).thenReturn(Optional.of(dayShift(99L, 17, 23)));
        when(scheduleRepo.findByEmployeeIdAndWorkDateBetween(1L, LocalDate.of(2026, 3, 17), LocalDate.of(2026, 3, 19)))
                .thenReturn(List.of(existing));
        when(scheduleRepo.save(any(EmployeeSchedule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, Object> result = employeeScheduleService.assignRange(request);

        assertEquals(1, result.get("created"));
        assertEquals(0, result.get("updated"));
        verify(scheduleRepo).save(any(EmployeeSchedule.class));
    }

    @Test
    void assignRangeThrowsWhenSameDayScheduleOverlaps() {
        AssignShiftRangeRequest request = request();
        EmployeeSchedule existing = EmployeeSchedule.builder()
                .scheduleId(100L)
                .employeeId(1L)
                .workDate(LocalDate.of(2026, 3, 18))
                .shiftId(99L)
                .build();

        when(shiftRepo.findById(10L)).thenReturn(Optional.of(dayShift(10L, 8, 17)));
        when(scheduleRepo.findByEmployeeIdAndWorkDateBetween(1L, LocalDate.of(2026, 3, 17), LocalDate.of(2026, 3, 19)))
                .thenReturn(List.of(existing));
        when(shiftRepo.findById(99L)).thenReturn(Optional.of(dayShift(99L, 16, 23)));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> employeeScheduleService.assignRange(request));

        assertTrueContains(ex.getMessage(), "Conflict");
        assertTrueContains(ex.getMessage(), "schedule_id=100");
    }

    @Test
    void assignRangeThrowsWhenPreviousNightShiftSpillsIntoTargetDay() {
        AssignShiftRangeRequest request = request();
        EmployeeSchedule previousNight = EmployeeSchedule.builder()
                .scheduleId(200L)
                .employeeId(1L)
                .workDate(LocalDate.of(2026, 3, 17))
                .shiftId(98L)
                .build();

        when(shiftRepo.findById(10L)).thenReturn(Optional.of(dayShift(10L, 5, 12)));
        when(scheduleRepo.findByEmployeeIdAndWorkDateBetween(1L, LocalDate.of(2026, 3, 17), LocalDate.of(2026, 3, 19)))
                .thenReturn(List.of(previousNight));
        when(shiftRepo.findById(98L)).thenReturn(Optional.of(dayShift(98L, 22, 6)));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> employeeScheduleService.assignRange(request));

        assertTrueContains(ex.getMessage(), "Conflict");
        assertTrueContains(ex.getMessage(), "2026-03-18");
    }

    @Test
    void assignRangeIgnoresPreviousDayScheduleWhenItDoesNotSpillIntoTargetDay() {
        AssignShiftRangeRequest request = request();
        EmployeeSchedule previousDay = EmployeeSchedule.builder()
                .scheduleId(201L)
                .employeeId(1L)
                .workDate(LocalDate.of(2026, 3, 17))
                .shiftId(98L)
                .build();

        when(shiftRepo.findById(10L)).thenReturn(Optional.of(dayShift(10L, 8, 17)));
        when(scheduleRepo.findByEmployeeIdAndWorkDateBetween(1L, LocalDate.of(2026, 3, 17), LocalDate.of(2026, 3, 19)))
                .thenReturn(List.of(previousDay));
        when(shiftRepo.findById(98L)).thenReturn(Optional.of(dayShift(98L, 16, 0)));
        when(scheduleRepo.save(any(EmployeeSchedule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, Object> result = employeeScheduleService.assignRange(request);

        assertEquals(1, result.get("created"));
        assertEquals(0, result.get("updated"));
    }

    @Test
    void getEmployeeScheduleByDayDelegatesToRepository() {
        LocalDate date = LocalDate.of(2026, 3, 18);
        List<EmployeeScheduleDayResponse> expected = List.of(
                new EmployeeScheduleDayResponse(1L, 1L, date, 10L, "DAY", "Day Shift",
                        LocalTime.of(8, 0), LocalTime.of(17, 0), 60, false,
                        EmployeeSchedule.ScheduleSource.MANUAL, "note")
        );
        when(scheduleRepo.findDaySchedules(1L, date)).thenReturn(expected);

        List<EmployeeScheduleDayResponse> actual = employeeScheduleService.getEmployeeScheduleByDay(1L, date);

        assertSame(expected, actual);
    }

    private void assertTrueContains(String actual, String expectedPart) {
        org.junit.jupiter.api.Assertions.assertTrue(actual.contains(expectedPart));
    }

    private AssignShiftRangeRequest request() {
        return AssignShiftRangeRequest.builder()
                .employeeId(1L)
                .shiftId(10L)
                .startDate(LocalDate.of(2026, 3, 18))
                .endDate(LocalDate.of(2026, 3, 18))
                .scheduleSource("MANUAL")
                .note("note")
                .overwrite(true)
                .build();
    }

    private ShiftTemplate dayShift(Long shiftId, int startHour, int endHour) {
        return ShiftTemplate.builder()
                .shiftId(shiftId)
                .startTime(LocalTime.of(startHour, 0))
                .endTime(LocalTime.of(endHour % 24, 0))
                .isNightShift(endHour <= startHour)
                .build();
    }
}
