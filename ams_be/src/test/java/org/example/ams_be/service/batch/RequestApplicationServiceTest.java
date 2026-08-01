package org.example.ams_be.service.batch;

import org.example.ams_be.dto.AttendanceCalculationResult;
import org.example.ams_be.entity.Employee;
import org.example.ams_be.entity.Requests;
import org.example.ams_be.enums.AttendanceCalcStatus;
import org.example.ams_be.enums.RequestStatus;
import org.example.ams_be.enums.RequestType;
import org.example.ams_be.repository.RequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RequestApplicationServiceTest {

    @Mock
    private RequestRepository requestRepository;

    @InjectMocks
    private RequestApplicationService requestApplicationService;

    @Test
    void applyRequestsReturnsOriginalResultWhenNoApprovedRequestExists() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        AttendanceCalculationResult result = result(1L, AttendanceCalcStatus.PRESENT, 0, 0, "");
        when(requestRepository.findApprovedRequestsOverlappingDay(
                org.mockito.ArgumentMatchers.eq(RequestStatus.APPROVED),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(List.of());

        List<AttendanceCalculationResult> updated = requestApplicationService.applyRequests(List.of(result), processDate);

        assertEquals(1, updated.size());
        assertSame(result, updated.get(0));
        verifyRequestWindow(processDate);
    }

    @Test
    void applyRequestsReturnsOriginalResultWhenApprovedRequestsBelongToDifferentEmployee() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        AttendanceCalculationResult result = result(1L, AttendanceCalcStatus.PRESENT, 0, 0, "");
        when(requestRepository.findApprovedRequestsOverlappingDay(
                org.mockito.ArgumentMatchers.eq(RequestStatus.APPROVED),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(List.of(request(99L, RequestType.LEAVE, "Other employee")));

        AttendanceCalculationResult updated = requestApplicationService.applyRequests(List.of(result), processDate).get(0);

        assertSame(result, updated);
    }

    @Test
    void applyRequestsTurnsAbsentIntoOnLeaveForApprovedLeaveRequest() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        AttendanceCalculationResult result = result(1L, AttendanceCalcStatus.ABSENT, 0, 0, "No schedule found");
        when(requestRepository.findApprovedRequestsOverlappingDay(
                org.mockito.ArgumentMatchers.eq(RequestStatus.APPROVED),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(List.of(request(1L, RequestType.LEAVE, "Annual leave")));

        AttendanceCalculationResult updated = requestApplicationService.applyRequests(List.of(result), processDate).get(0);

        assertEquals(AttendanceCalcStatus.ON_LEAVE, updated.getStatus());
        assertTrue(updated.isRequestApplied());
        assertEquals("No schedule found | On leave: LEAVE - Annual leave", updated.getNote());
        assertEquals(0, updated.getLateMinutes());
        assertEquals(0, updated.getEarlyLeaveMinutes());
    }

    @Test
    void applyRequestsTurnsMissingLogIntoOnLeaveWhenLeaveRequestHasBlankOldNote() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        AttendanceCalculationResult result = result(1L, AttendanceCalcStatus.MISSING_LOG, 0, 0, "   ");
        when(requestRepository.findApprovedRequestsOverlappingDay(
                org.mockito.ArgumentMatchers.eq(RequestStatus.APPROVED),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(List.of(request(1L, RequestType.LEAVE, null)));

        AttendanceCalculationResult updated = requestApplicationService.applyRequests(List.of(result), processDate).get(0);

        assertEquals(AttendanceCalcStatus.ON_LEAVE, updated.getStatus());
        assertEquals("On leave: LEAVE", updated.getNote());
        assertTrue(updated.isRequestApplied());
    }

    @Test
    void applyRequestsApprovesLateRequestAndClearsLateMinutes() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        AttendanceCalculationResult result = result(2L, AttendanceCalcStatus.LATE, 15, 0, "Late 15 minutes.");
        when(requestRepository.findApprovedRequestsOverlappingDay(
                org.mockito.ArgumentMatchers.eq(RequestStatus.APPROVED),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(List.of(request(2L, RequestType.LATE_EARLY, "Traffic jam")));

        AttendanceCalculationResult updated = requestApplicationService.applyRequests(List.of(result), processDate).get(0);

        assertEquals(AttendanceCalcStatus.PRESENT, updated.getStatus());
        assertEquals(0, updated.getLateMinutes());
        assertEquals("Late 15 minutes. | Late approved - Traffic jam", updated.getNote());
        assertTrue(updated.isRequestApplied());
    }

    @Test
    void applyRequestsApprovesEarlyLeaveRequestAndClearsEarlyLeaveMinutes() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        AttendanceCalculationResult result = result(3L, AttendanceCalcStatus.EARLY_LEAVE, 0, 25, "Early leave 25 minutes.");
        when(requestRepository.findApprovedRequestsOverlappingDay(
                org.mockito.ArgumentMatchers.eq(RequestStatus.APPROVED),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(List.of(request(3L, RequestType.LATE_EARLY, "")));

        AttendanceCalculationResult updated = requestApplicationService.applyRequests(List.of(result), processDate).get(0);

        assertEquals(AttendanceCalcStatus.PRESENT, updated.getStatus());
        assertEquals(0, updated.getEarlyLeaveMinutes());
        assertEquals("Early leave 25 minutes. | Early leave approved", updated.getNote());
        assertTrue(updated.isRequestApplied());
    }

    @Test
    void applyRequestsAppendsLeaveNoteWhenOldNoteIsNull() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        AttendanceCalculationResult result = result(7L, AttendanceCalcStatus.ABSENT, 0, 0, null);
        when(requestRepository.findApprovedRequestsOverlappingDay(
                org.mockito.ArgumentMatchers.eq(RequestStatus.APPROVED),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(List.of(request(7L, RequestType.LEAVE, "Sick")));

        AttendanceCalculationResult updated = requestApplicationService.applyRequests(List.of(result), processDate).get(0);

        assertEquals("On leave: LEAVE - Sick", updated.getNote());
        assertTrue(updated.isRequestApplied());
    }

    @Test
    void applyRequestsSkipsNullAndUnsupportedRequestTypesAndStopsAtFirstAppliedRequest() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        AttendanceCalculationResult result = result(4L, AttendanceCalcStatus.LATE, 20, 0, "");
        when(requestRepository.findApprovedRequestsOverlappingDay(
                org.mockito.ArgumentMatchers.eq(RequestStatus.APPROVED),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(List.of(
                request(4L, null, "ignored"),
                request(4L, RequestType.OVERTIME, "ignored"),
                request(4L, RequestType.LATE_EARLY, "accepted"),
                request(4L, RequestType.LEAVE, "should not be applied")
        ));

        AttendanceCalculationResult updated = requestApplicationService.applyRequests(List.of(result), processDate).get(0);

        assertEquals(AttendanceCalcStatus.PRESENT, updated.getStatus());
        assertEquals("Late approved - accepted", updated.getNote());
        assertTrue(updated.isRequestApplied());
        assertFalse(updated.getStatus() == AttendanceCalcStatus.ON_LEAVE);
    }

    @Test
    void applyRequestsKeepsPresentResultWhenLeaveRequestDoesNotApply() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        AttendanceCalculationResult result = result(5L, AttendanceCalcStatus.PRESENT, 0, 0, "Already present");
        when(requestRepository.findApprovedRequestsOverlappingDay(
                org.mockito.ArgumentMatchers.eq(RequestStatus.APPROVED),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(List.of(request(5L, RequestType.LEAVE, "Annual leave")));

        AttendanceCalculationResult updated = requestApplicationService.applyRequests(List.of(result), processDate).get(0);

        assertSame(result, updated);
    }

    @Test
    void applyRequestsKeepsPresentResultWhenLateEarlyRequestDoesNotApply() {
        LocalDate processDate = LocalDate.of(2026, 3, 18);
        AttendanceCalculationResult result = result(6L, AttendanceCalcStatus.PRESENT, 0, 0, "Already present");
        when(requestRepository.findApprovedRequestsOverlappingDay(
                org.mockito.ArgumentMatchers.eq(RequestStatus.APPROVED),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(List.of(request(6L, RequestType.LATE_EARLY, "ignored")));

        AttendanceCalculationResult updated = requestApplicationService.applyRequests(List.of(result), processDate).get(0);

        assertSame(result, updated);
    }

    private void verifyRequestWindow(LocalDate processDate) {
        ArgumentCaptor<LocalDateTime> startCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<LocalDateTime> endCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(requestRepository).findApprovedRequestsOverlappingDay(
                org.mockito.ArgumentMatchers.eq(RequestStatus.APPROVED),
                startCaptor.capture(),
                endCaptor.capture()
        );
        assertEquals(processDate.atStartOfDay(), startCaptor.getValue());
        assertEquals(processDate.plusDays(1).atStartOfDay().minusNanos(1), endCaptor.getValue());
    }

    private AttendanceCalculationResult result(Long employeeId, AttendanceCalcStatus status, int lateMinutes, int earlyLeaveMinutes, String note) {
        return AttendanceCalculationResult.builder()
                .employeeId(employeeId)
                .workDate(LocalDate.of(2026, 3, 18))
                .status(status)
                .lateMinutes(lateMinutes)
                .earlyLeaveMinutes(earlyLeaveMinutes)
                .workingHours(8.0)
                .isNightShift(false)
                .isRequestApplied(false)
                .note(note)
                .build();
    }

    private Requests request(Long employeeId, RequestType type, String reason) {
        Employee employee = Employee.builder().employeeId(employeeId).build();
        Requests request = new Requests();
        request.setEmployee(employee);
        request.setRequestType(type);
        request.setReason(reason);
        return request;
    }
}
