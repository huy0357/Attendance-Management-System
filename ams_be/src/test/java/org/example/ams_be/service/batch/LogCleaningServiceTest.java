package org.example.ams_be.service.batch;

import org.example.ams_be.dto.EmployeeLogSummary;
import org.example.ams_be.entity.FaceEvent;
import org.example.ams_be.repository.FaceEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LogCleaningServiceTest {

    @Mock
    private FaceEventRepository faceEventRepository;

    @InjectMocks
    private LogCleaningService logCleaningService;

    @Test
    void fetchAndCleanLogsReturnsEmptyListWhenNoMatchedEvents() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        LocalDateTime globalStart = processDate.atStartOfDay();
        LocalDateTime globalEnd = processDate.plusDays(1).atTime(12, 0);

        when(faceEventRepository.findEventsForBatch(globalStart, globalEnd, processDate))
                .thenReturn(Collections.emptyList());

        List<EmployeeLogSummary> result = logCleaningService.fetchAndCleanLogs(processDate, Map.of());

        assertTrue(result.isEmpty());
        verify(faceEventRepository).findEventsForBatch(globalStart, globalEnd, processDate);
    }

    @Test
    void fetchAndCleanLogsFiltersGroupsSortsAndNormalizesEvents() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        LocalDateTime globalStart = processDate.atStartOfDay();
        LocalDateTime globalEnd = processDate.plusDays(1).atTime(12, 0);
        LocalDateTime eightAm = LocalDateTime.of(2026, 3, 18, 8, 0);
        LocalDateTime noon = LocalDateTime.of(2026, 3, 18, 12, 0);
        LocalDateTime sixPm = LocalDateTime.of(2026, 3, 18, 18, 0);

        when(faceEventRepository.findEventsForBatch(globalStart, globalEnd, processDate))
                .thenReturn(List.of(
                        FaceEvent.builder().employeeId(1L).eventTime(sixPm).direction(" out ").matchStatus("MATCH").build(),
                        FaceEvent.builder().employeeId(1L).eventTime(eightAm).direction(" in ").matchStatus("match").build(),
                        FaceEvent.builder().employeeId(2L).eventTime(noon).direction(null).matchStatus("MATCH").build()
                ));

        List<EmployeeLogSummary> result = logCleaningService.fetchAndCleanLogs(processDate, Map.of());

        assertEquals(2, result.size());

        EmployeeLogSummary employeeOne = result.stream()
                .filter(item -> item.getEmployeeId().equals(1L))
                .findFirst()
                .orElseThrow();
        assertEquals(2, employeeOne.getLogEntries().size());
        assertEquals(eightAm, employeeOne.getLogEntries().get(0).getTimestamp());
        assertEquals("IN", employeeOne.getLogEntries().get(0).getEventType());
        assertEquals(sixPm, employeeOne.getLogEntries().get(1).getTimestamp());
        assertEquals("OUT", employeeOne.getLogEntries().get(1).getEventType());

        EmployeeLogSummary employeeTwo = result.stream()
                .filter(item -> item.getEmployeeId().equals(2L))
                .findFirst()
                .orElseThrow();
        assertEquals(1, employeeTwo.getLogEntries().size());
        assertEquals("UNKNOWN", employeeTwo.getLogEntries().get(0).getEventType());
        assertEquals(noon, employeeTwo.getLogEntries().get(0).getTimestamp());
    }
}
