package org.example.ams_be.service;

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

    @Transactional
    public RequestsResponse create(RequestsUpsertRequest input) {
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

        return mapToDto(requestRepository.save(entity));
    }

    public List<RequestsResponse> getMyRequests(Long employeeId) {
        return requestRepository.findByEmployee_EmployeeIdOrderByCreatedAtDesc(employeeId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional
    public RequestsResponse update(Long requestId, RequestsUpsertRequest input) {
        Requests request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        if (request.getStatus() != RequestStatus.SUBMITTED) {
            throw new IllegalStateException("Cannot update request that is already processed");
        }

        request.setTitle(input.title);
        request.setReason(input.reason);
        request.setStartDatetime(input.startDatetime);
        request.setEndDatetime(input.endDatetime);
        request.setRequestType(input.requestType);

        return mapToDto(requestRepository.save(request));
    }

    @Transactional
    public void delete(Long requestId) {
        Requests request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));
        
        if (request.getStatus() != RequestStatus.DRAFT) {
            throw new IllegalStateException("Cannot delete request that is already processed");
        }
        requestRepository.delete(request);
    }

    @Transactional
    public RequestsResponse approveOrReject(Long requestId, RequestsApprovalRequest approvalDto) {
        Requests request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        org.example.ams_be.dto.EmployeeDto approverDto = employeeRepository.findById(approvalDto.approverId)
                .orElseThrow(() -> new ResourceNotFoundException("Approver not found"));

        Employee approverRef = new Employee();
        approverRef.setEmployeeId(approverDto.employeeId);

        request.setStatus(approvalDto.status);
        request.setApprover(approverRef);
        request.setDecisionNote(approvalDto.decisionNote);

        return mapToDto(requestRepository.save(request));
    }

    private RequestsResponse mapToDto(Requests entity) {
        RequestsResponse dto = new RequestsResponse();
        dto.requestId = entity.getRequestId();
        dto.employeeId = entity.getEmployee().getEmployeeId();
        dto.employeeName = entity.getEmployee().getFullName();
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

