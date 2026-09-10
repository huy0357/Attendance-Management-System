package org.example.ams_be.controller;

import org.example.ams_be.dto.request.AssignShiftRangeRequest;
import org.example.ams_be.dto.response.EmployeeScheduleDayResponse;
import org.example.ams_be.entity.EmployeeSchedule;
import org.example.ams_be.service.EmployeeScheduleService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeScheduleControllerTest {

    @Mock
    private EmployeeScheduleService service;

    @InjectMocks
    private EmployeeScheduleController controller;

    @Test
    void assignRangeDelegatesAndReturnsServiceMap() {
        AssignShiftRangeRequest request = AssignShiftRangeRequest.builder()
                .employeeId(1L)
                .shiftId(2L)
                .startDate(LocalDate.of(2026, 3, 1))
                .endDate(LocalDate.of(2026, 3, 7))
                .scheduleSource("MANUAL")
                .overwrite(true)
                .build();
        Map<String, Object> expected = Map.of("affected", 7);
        when(service.assignRange(request)).thenReturn(expected);

        Map<String, Object> response = controller.assignRange(request);

        assertEquals(expected, response);
    }

    @Test
    void getByEmployeeDayDelegates() {
        LocalDate date = LocalDate.of(2026, 3, 18);
        List<EmployeeScheduleDayResponse> expected = List.of(new EmployeeScheduleDayResponse(
                1L, 5L, date, 2L, "DAY", "Day Shift",
                LocalTime.of(8, 0), LocalTime.of(17, 0), 60, false,
                EmployeeSchedule.ScheduleSource.MANUAL, "ok"
        ));
        when(service.getEmployeeScheduleByDay(5L, date)).thenReturn(expected);

        List<EmployeeScheduleDayResponse> response = controller.getByEmployeeDay(5L, date);

        assertEquals(expected, response);
        verify(service).getEmployeeScheduleByDay(5L, date);
    }

    @Test
    void deleteScheduleDelegates() {
        Map<String, Object> response = controller.deleteSchedule(10L);

        assertEquals(true, response.get("success"));
        assertEquals(10L, response.get("deletedScheduleId"));
        verify(service).deleteSchedule(10L);
    }

    @Test
    void deleteByEmployeeDayDelegates() {
        LocalDate date = LocalDate.of(2026, 3, 18);
        Map<String, Object> response = controller.deleteByEmployeeDay(5L, date);

        assertEquals(true, response.get("success"));
        assertEquals(5L, response.get("employeeId"));
        verify(service).deleteScheduleByEmployeeAndDate(5L, date);
    }
}
