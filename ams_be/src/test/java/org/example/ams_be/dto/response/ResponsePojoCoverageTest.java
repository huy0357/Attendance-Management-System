package org.example.ams_be.dto.response;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.example.ams_be.entity.EmployeeSchedule.ScheduleSource.MANUAL;
import static org.example.ams_be.support.ModelCoverageAssertions.assertPojoCoverage;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ResponsePojoCoverageTest {

    @Test
    void responseClassesCoverConstructorsAccessorsAndObjectMethods() {
        assertPojoCoverage(AccountResponse.class);
        assertPojoCoverage(AttendanceDailyResponse.class);
        assertPojoCoverage(AuthResponse.class);
        assertPojoCoverage(RequestsResponse.class);
        assertPojoCoverage(ShiftTemplateResponse.class);
    }

    @Test
    void employeeScheduleDayResponseConstructorExposesAllValues() {
        EmployeeScheduleDayResponse response = new EmployeeScheduleDayResponse(
                1L,
                2L,
                java.time.LocalDate.of(2026, 2, 1),
                3L,
                "S1",
                "Morning",
                java.time.LocalTime.of(8, 0),
                java.time.LocalTime.of(17, 0),
                60,
                false,
                MANUAL,
                "note"
        );

        assertEquals(1L, response.getScheduleId());
        assertEquals(2L, response.getEmployeeId());
        assertEquals("S1", response.getShiftCode());
        assertEquals("Morning", response.getShiftName());
        assertEquals(MANUAL, response.getScheduleSource());
        assertEquals("note", response.getNote());
    }

    @Test
    void pageResponseConstructorCalculatesPagingFlags() {
        PageResponse<String> page = new PageResponse<>(List.of("a", "b"), 2, 2, 5);

        assertEquals(List.of("a", "b"), page.items);
        assertEquals(3, page.totalPages);
        assertTrue(page.hasPrev);
        assertTrue(page.hasNext);
    }

    @Test
    void pageResponseConstructorHandlesLastPage() {
        PageResponse<String> page = new PageResponse<>(List.of("c"), 3, 2, 5);

        assertEquals(3, page.totalPages);
        assertTrue(page.hasPrev);
        assertFalse(page.hasNext);
    }
}
