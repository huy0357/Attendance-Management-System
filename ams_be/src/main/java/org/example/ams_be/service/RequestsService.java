package org.example.ams_be.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.example.ams_be.dto.EmployeeDto;
import org.example.ams_be.dto.request.RequestsApprovalRequest;
import org.example.ams_be.dto.request.RequestsUpsertRequest;
import org.example.ams_be.dto.response.RequestsResponse;
import org.example.ams_be.entity.Employee;
import org.example.ams_be.entity.Requests;
import org.example.ams_be.enums.RequestStatus;
import org.example.ams_be.exception.ResourceNotFoundException;
import org.example.ams_be.repository.EmployeeRepository;
import org.example.ams_be.repository.RequestRepository;
import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RequestsService {
    private final RequestRepository requestRepository;
    private final EmployeeRepository employeeRepository;
    private final AuditLogService auditLogService;


    @Transactional
    public RequestsResponse createDraft(RequestsUpsertRequest input) {
        if (input.startDatetime.isAfter(input.endDatetime)) {
            throw new IllegalArgumentException("Start time must be before end time");
        }

        EmployeeDto empDto = employeeRepository.findById(input.employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        Employee employeeRef = new Employee();
        employeeRef.setEmployeeId(empDto.employeeId);

        Requests entity = new Requests();
        entity.setEmployee(employeeRef);
        entity.setRequestType(input.requestType);
        entity.setTitle(input.title);
        entity.setReason(input.reason);
        entity.setStartDatetime(input.startDatetime);
        entity.setEndDatetime(input.endDatetime);
        entity.setStatus(RequestStatus.DRAFT);

        Requests saved = requestRepository.save(entity);
        RequestsResponse response = mapToDto(saved);
        auditLogService.saveAuditLog("CREATE", "REQUEST", saved.getRequestId(), input.employeeId, null, response);
        return response;
    }

    @Transactional
    public RequestsResponse submit(Long id) {
        Requests entity = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        RequestsResponse oldDto = mapToDto(entity);

        if (entity.getStatus() != RequestStatus.DRAFT) {
            throw new IllegalStateException("Chỉ được nộp đơn khi đang ở trạng thái nháp");
        }

        entity.setStatus(RequestStatus.SUBMITTED);
        entity.setSubmittedAt(LocalDateTime.now());

        Requests saved = requestRepository.save(entity);
        RequestsResponse newDto = mapToDto(saved);

        // Ghi Log: Hành động nộp đơn
        auditLogService.saveAuditLog("SUBMIT", "REQUEST", id, newDto.employeeId, oldDto, newDto);

        return newDto;
    }

    @Transactional
    public RequestsResponse update(Long requestId, RequestsUpsertRequest input) {
        Requests request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        RequestsResponse oldDto = mapToDto(request);

        if (request.getStatus() != RequestStatus.DRAFT && request.getStatus() != RequestStatus.SUBMITTED) {
            throw new IllegalStateException("Cannot update request that is already processed");
        }

        request.setTitle(input.title);
        request.setReason(input.reason);
        request.setStartDatetime(input.startDatetime);
        request.setEndDatetime(input.endDatetime);
        request.setRequestType(input.requestType);

        Requests saved = requestRepository.save(request);
        RequestsResponse newDto = mapToDto(saved);
        auditLogService.saveAuditLog("UPDATE", "REQUEST", requestId, newDto.employeeId, oldDto, newDto);

        return newDto;
    }

    @Transactional
    public void delete(Long requestId) {
        Requests request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        if (request.getStatus() != RequestStatus.DRAFT) {
            throw new IllegalStateException("Cannot delete request that is already processed");
        }

        RequestsResponse oldDto = mapToDto(request);
        requestRepository.delete(request);
        auditLogService.saveAuditLog("DELETE", "REQUEST", requestId, oldDto.employeeId, oldDto, null);
    }

    @Transactional
    public RequestsResponse approveOrReject(Long requestId, RequestsApprovalRequest approvalDto) {
        Requests request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        if (request.getStatus() != RequestStatus.SUBMITTED) {
            throw new IllegalStateException("Đơn này hiện không ở trạng thái chờ duyệt (SUBMITTED).");
        }

        RequestsResponse oldDto = mapToDto(request);

        Employee approverRef = new Employee();
        approverRef.setEmployeeId(approvalDto.approverId);

        request.setStatus(approvalDto.status);
        request.setApprover(approverRef);
        request.setDecisionNote(approvalDto.decisionNote);

        Requests savedRequest = requestRepository.save(request);
        RequestsResponse newDto = mapToDto(savedRequest);
        auditLogService.saveAuditLog(approvalDto.status.name(), "REQUEST", requestId, approvalDto.approverId, oldDto, newDto);

        return newDto;
    }

    @Transactional
    public List<RequestsResponse> getMyRequests(Long employeeId) {
        return requestRepository.findByEmployee_EmployeeIdOrderByCreatedAtDesc(employeeId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    private RequestsResponse mapToDto(Requests entity) {
        RequestsResponse dto = new RequestsResponse();
        dto.requestId = entity.getRequestId();
        if (entity.getEmployee() != null) {
            dto.employeeId = entity.getEmployee().getEmployeeId();
            dto.employeeName = entity.getEmployee().getFullName();
        }
        dto.requestType = entity.getRequestType();
        dto.title = entity.getTitle();
        dto.reason = entity.getReason();
        dto.startDatetime = entity.getStartDatetime();
        dto.endDatetime = entity.getEndDatetime();
        dto.status = entity.getStatus();
        dto.submittedAt = entity.getSubmittedAt();
        dto.decisionNote = entity.getDecisionNote();

        if (entity.getApprover() != null) {
            dto.approverId = entity.getApprover().getEmployeeId();
            dto.approverName = entity.getApprover().getFullName();
        }
        return dto;
    }
}