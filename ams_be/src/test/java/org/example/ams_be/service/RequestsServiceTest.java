package org.example.ams_be.service;

import org.example.ams_be.dto.response.PageResponse;
import org.example.ams_be.dto.EmployeeDto;
import org.example.ams_be.dto.request.RequestsApprovalRequest;
import org.example.ams_be.dto.request.RequestsUpsertRequest;
import org.example.ams_be.dto.response.RequestsResponse;
import org.example.ams_be.entity.Employee;
import org.example.ams_be.entity.Requests;
import org.example.ams_be.enums.RequestStatus;
import org.example.ams_be.enums.RequestType;
import org.example.ams_be.exception.BadRequestException;
import org.example.ams_be.exception.ResourceNotFoundException;
import org.example.ams_be.repository.EmployeeRepository;
import org.example.ams_be.repository.RequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RequestsServiceTest {

    @Mock
    private RequestRepository requestRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private RequestsService requestsService;

    @Test
    void createDraftThrowsWhenStartAfterEnd() {
        RequestsUpsertRequest request = upsertRequest();
        request.startDatetime = LocalDateTime.of(2026, 3, 20, 10, 0);
        request.endDatetime = LocalDateTime.of(2026, 3, 20, 9, 0);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> requestsService.createDraft(request));

        assertEquals("Start time must be before end time", ex.getMessage());
    }

    @Test
    void createDraftThrowsWhenEmployeeNotFound() {
        RequestsUpsertRequest request = upsertRequest();
        when(employeeRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> requestsService.createDraft(request));
    }

    @Test
    void createDraftSavesDraftAndWritesAuditLog() {
        RequestsUpsertRequest request = upsertRequest();
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employeeDto()));
        when(requestRepository.save(any(Requests.class))).thenAnswer(invocation -> {
            Requests saved = invocation.getArgument(0);
            saved.setRequestId(99L);
            return saved;
        });

        RequestsResponse response = requestsService.createDraft(request);

        assertEquals(99L, response.requestId);
        assertEquals(1L, response.employeeId);
        assertEquals(RequestStatus.DRAFT, response.status);
        verify(auditLogService).saveAuditLog(org.mockito.ArgumentMatchers.eq("CREATE"),
                org.mockito.ArgumentMatchers.eq("REQUEST"),
                org.mockito.ArgumentMatchers.eq(99L), org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.isNull(), any(RequestsResponse.class));
    }

    @Test
    void submitThrowsWhenStatusIsNotDraft() {
        Requests request = requestEntity(10L, RequestStatus.APPROVED);
        when(requestRepository.findById(10L)).thenReturn(Optional.of(request));

        assertThrows(IllegalStateException.class, () -> requestsService.submit(10L, 1L));
    }

    @Test
    void submitUpdatesStatusAndWritesAuditLog() {
        Requests request = requestEntity(10L, RequestStatus.DRAFT);
        when(requestRepository.findById(10L)).thenReturn(Optional.of(request));
        when(requestRepository.save(request)).thenReturn(request);

        RequestsResponse response = requestsService.submit(10L, 1L);

        assertEquals(RequestStatus.SUBMITTED, response.status);
        assertEquals(10L, response.requestId);
        assertTrue(response.submittedAt != null);
        verify(auditLogService).saveAuditLog(org.mockito.ArgumentMatchers.eq("SUBMIT"),
                org.mockito.ArgumentMatchers.eq("REQUEST"),
                org.mockito.ArgumentMatchers.eq(10L), org.mockito.ArgumentMatchers.eq(1L), any(RequestsResponse.class),
                any(RequestsResponse.class));
    }

    @Test
    void updateThrowsWhenRequestAlreadyProcessed() {
        Requests request = requestEntity(10L, RequestStatus.APPROVED);
        when(requestRepository.findById(10L)).thenReturn(Optional.of(request));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> requestsService.update(10L, 1L, upsertRequest()));

        assertEquals("Cannot update request that is already processed", ex.getMessage());
    }

    @Test
    void updateMutatesDraftRequestAndWritesAuditLog() {
        Requests request = requestEntity(11L, RequestStatus.DRAFT);
        RequestsUpsertRequest update = upsertRequest();
        update.title = "WFH";
        update.reason = "Need focus";
        update.requestType = RequestType.REMOTE;
        update.startDatetime = LocalDateTime.of(2026, 3, 21, 9, 0);
        update.endDatetime = LocalDateTime.of(2026, 3, 21, 18, 0);
        when(requestRepository.findById(11L)).thenReturn(Optional.of(request));
        when(requestRepository.save(request)).thenReturn(request);

        RequestsResponse response = requestsService.update(11L, 1L, update);

        assertEquals("WFH", response.title);
        assertEquals("Need focus", response.reason);
        assertEquals(RequestType.REMOTE, response.requestType);
        verify(auditLogService).saveAuditLog(org.mockito.ArgumentMatchers.eq("UPDATE"),
                org.mockito.ArgumentMatchers.eq("REQUEST"),
                org.mockito.ArgumentMatchers.eq(11L), org.mockito.ArgumentMatchers.eq(1L), any(RequestsResponse.class),
                any(RequestsResponse.class));
    }

    @Test
    void updateMutatesSubmittedRequestAndWritesAuditLog() {
        Requests request = requestEntity(15L, RequestStatus.SUBMITTED);
        RequestsUpsertRequest update = upsertRequest();
        update.title = "Adjusted";
        when(requestRepository.findById(15L)).thenReturn(Optional.of(request));
        when(requestRepository.save(request)).thenReturn(request);

        RequestsResponse response = requestsService.update(15L, 1L, update);

        assertEquals("Adjusted", response.title);
        assertEquals(RequestStatus.SUBMITTED, response.status);
    }

    @Test
    void deleteThrowsWhenRequestIsNotDraft() {
        Requests request = requestEntity(10L, RequestStatus.SUBMITTED);
        when(requestRepository.findById(10L)).thenReturn(Optional.of(request));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> requestsService.delete(10L, 1L));

        assertEquals("Cannot delete request that is already processed", ex.getMessage());
    }

    @Test
    void deleteRemovesDraftAndWritesAuditLog() {
        Requests request = requestEntity(10L, RequestStatus.DRAFT);
        when(requestRepository.findById(10L)).thenReturn(Optional.of(request));

        requestsService.delete(10L, 1L);

        verify(requestRepository).delete(request);
        verify(auditLogService).saveAuditLog(org.mockito.ArgumentMatchers.eq("DELETE"),
                org.mockito.ArgumentMatchers.eq("REQUEST"),
                org.mockito.ArgumentMatchers.eq(10L), org.mockito.ArgumentMatchers.eq(1L), any(RequestsResponse.class),
                org.mockito.ArgumentMatchers.isNull());
    }

    @Test
    void approveOrRejectThrowsWhenRequestNotSubmitted() {
        Requests request = requestEntity(10L, RequestStatus.DRAFT);
        when(requestRepository.findById(10L)).thenReturn(Optional.of(request));

        assertThrows(BadRequestException.class, () -> requestsService.approveOrReject(10L, approvalRequest()));
    }

    @Test
    void approveOrRejectUpdatesDecisionAndWritesAuditLog() {
        Requests request = requestEntity(10L, RequestStatus.SUBMITTED);
        when(requestRepository.findById(10L)).thenReturn(Optional.of(request));
        when(requestRepository.save(request)).thenReturn(request);

        RequestsResponse response = requestsService.approveOrReject(10L, approvalRequest());

        assertEquals(RequestStatus.APPROVED, response.status);
        assertEquals(2L, response.approverId);
        assertEquals("approved", response.decisionNote);
        verify(auditLogService).saveAuditLog(org.mockito.ArgumentMatchers.eq("APPROVED"),
                org.mockito.ArgumentMatchers.eq("REQUEST"),
                org.mockito.ArgumentMatchers.eq(10L), org.mockito.ArgumentMatchers.eq(2L), any(RequestsResponse.class),
                any(RequestsResponse.class));
    }

    @Test
    void approveOrRejectSupportsRejectedPath() {
        Requests request = requestEntity(12L, RequestStatus.SUBMITTED);
        RequestsApprovalRequest approval = new RequestsApprovalRequest();
        approval.approverId = 3L;
        approval.status = RequestStatus.REJECTED;
        approval.decisionNote = "rejected";
        when(requestRepository.findById(12L)).thenReturn(Optional.of(request));
        when(requestRepository.save(request)).thenReturn(request);

        RequestsResponse response = requestsService.approveOrReject(12L, approval);

        assertEquals(RequestStatus.REJECTED, response.status);
        assertEquals(3L, response.approverId);
        verify(auditLogService).saveAuditLog(org.mockito.ArgumentMatchers.eq("REJECTED"),
                org.mockito.ArgumentMatchers.eq("REQUEST"),
                org.mockito.ArgumentMatchers.eq(12L), org.mockito.ArgumentMatchers.eq(3L), any(RequestsResponse.class),
                any(RequestsResponse.class));
    }

    @Test
    void getMyRequestsMapsRepositoryResults() {
        Requests request = requestEntity(10L, RequestStatus.SUBMITTED);
        request.getEmployee().setFullName("Alice");
        Pageable pageable = PageRequest.of(0, 10, Sort.by("createdAt").descending());
        when(requestRepository.findByEmployeeWithFilter(1L, null, null, pageable))
                .thenReturn(new PageImpl<>(List.of(request), pageable, 1));

        PageResponse<RequestsResponse> responses = requestsService.getMyRequestsPaged(1L, null, null, 1, 10);

        assertEquals(1, responses.items.size());
        assertEquals(1L, responses.items.get(0).employeeId);
        assertEquals("Alice", responses.items.get(0).employeeName);
        assertNull(responses.items.get(0).approverId);
    }

    @Test
    void getMyRequestsLeavesEmployeeFieldsNullWhenEmployeeMissing() {
        Requests request = new Requests();
        request.setRequestId(20L);
        request.setStatus(RequestStatus.DRAFT);
        Pageable pageable = PageRequest.of(0, 10, Sort.by("createdAt").descending());
        when(requestRepository.findByEmployeeWithFilter(1L, null, null, pageable))
                .thenReturn(new PageImpl<>(List.of(request), pageable, 1));

        PageResponse<RequestsResponse> responses = requestsService.getMyRequestsPaged(1L, null, null, 1, 10);

        assertEquals(1, responses.items.size());
        assertNull(responses.items.get(0).employeeId);
        assertNull(responses.items.get(0).employeeName);
    }

    private RequestsUpsertRequest upsertRequest() {
        RequestsUpsertRequest request = new RequestsUpsertRequest();
        request.employeeId = 1L;
        request.requestType = RequestType.LEAVE;
        request.title = "Leave";
        request.reason = "Personal";
        request.startDatetime = LocalDateTime.of(2026, 3, 20, 8, 0);
        request.endDatetime = LocalDateTime.of(2026, 3, 20, 17, 0);
        return request;
    }

    private RequestsApprovalRequest approvalRequest() {
        RequestsApprovalRequest request = new RequestsApprovalRequest();
        request.approverId = 2L;
        request.status = RequestStatus.APPROVED;
        request.decisionNote = "approved";
        return request;
    }

    private EmployeeDto employeeDto() {
        EmployeeDto dto = new EmployeeDto();
        dto.employeeId = 1L;
        dto.fullName = "Alice";
        return dto;
    }

    private Requests requestEntity(Long id, RequestStatus status) {
        Requests request = new Requests();
        request.setRequestId(id);
        request.setEmployee(Employee.builder().employeeId(1L).fullName("Alice").build());
        request.setRequestType(RequestType.LEAVE);
        request.setTitle("Leave");
        request.setReason("Personal");
        request.setStartDatetime(LocalDateTime.of(2026, 3, 20, 8, 0));
        request.setEndDatetime(LocalDateTime.of(2026, 3, 20, 17, 0));
        request.setStatus(status);
        return request;
    }
}
