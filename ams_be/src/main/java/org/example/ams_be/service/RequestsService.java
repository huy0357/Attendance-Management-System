package org.example.ams_be.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.example.ams_be.dto.EmployeeDto;
import org.example.ams_be.dto.request.RequestsApprovalRequest;
import org.example.ams_be.dto.request.RequestsUpsertRequest;
import org.example.ams_be.dto.response.PageResponse; // Giả định bạn đã có class này
import org.example.ams_be.dto.response.RequestsResponse;
import org.example.ams_be.entity.Employee;
import org.example.ams_be.entity.Requests;
import org.example.ams_be.enums.RequestStatus;
import org.example.ams_be.enums.RequestType;
import org.example.ams_be.exception.BadRequestException;
import org.example.ams_be.exception.ResourceNotFoundException;
import org.example.ams_be.repository.EmployeeRepository;
import org.example.ams_be.repository.RequestRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RequestsService {
    private final RequestRepository requestRepository;
    private final EmployeeRepository employeeRepository;
    private final AuditLogService auditLogService;

    // 1. Lấy chi tiết đơn (Giải quyết thiếu hụt GET /api/requests/{id})
    @Transactional
    public RequestsResponse getRequestById(Long id) {
        return requestRepository.findById(id)
                .map(this::mapToDto)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found with id: " + id));
    }

    // 2. Lấy danh sách cá nhân (My Requests) có Paging & Filter
    @Transactional
    public PageResponse<RequestsResponse> getMyRequestsPaged(
            Long employeeId, RequestStatus status, RequestType type, int page, int size) {

        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());
        Page<Requests> result = requestRepository.findByEmployeeWithFilter(employeeId, status, type, pageable);

        List<RequestsResponse> content = result.getContent().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());

        return new PageResponse<>(content, page, size, result.getTotalElements());
    }

    // 3. Manager Queue - Lấy danh sách chờ duyệt của cấp dưới
    @Transactional
    public PageResponse<RequestsResponse> getManagerQueue(
            Long managerId, RequestStatus status, RequestType type, int page, int size) {

        // Nghiệp vụ: Manager chỉ được xem đơn đã nộp (SUBMITTED) hoặc đã xử lý
        // (APPROVED/REJECTED)
        // Tuyệt đối không được xem DRAFT.
        RequestStatus effectiveStatus = (status == null) ? RequestStatus.SUBMITTED : status;

        if (effectiveStatus == RequestStatus.DRAFT) {
            throw new BadRequestException("Manager không có quyền xem đơn ở trạng thái nháp.");
        }
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("submittedAt").descending());
        Page<Requests> result = requestRepository.findByManagerQueue(managerId, status, type, pageable);

        List<RequestsResponse> content = result.getContent().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());

        return new PageResponse<>(content, page, size, result.getTotalElements());
    }

    // 4. Admin/Global Management - Xem toàn bộ hệ thống
    @Transactional
    public PageResponse<RequestsResponse> getAllGlobal(
            RequestStatus status, RequestType type, int page, int size) {

        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());
        Page<Requests> result = requestRepository.findAllGlobal(status, type, pageable);

        List<RequestsResponse> content = result.getContent().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());

        return new PageResponse<>(content, page, size, result.getTotalElements());
    }

    // 5. Cải tiến hàm Approve/Reject (Strict Contract)
    @Transactional
    public RequestsResponse approveOrReject(Long requestId, RequestsApprovalRequest approvalDto) {
        Requests request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        if (request.getStatus() != RequestStatus.SUBMITTED) {
            throw new BadRequestException("Đơn không ở trạng thái chờ duyệt (SUBMITTED)");
        }

        // BẮT BUỘC: Chỉ cho phép chuyển sang APPROVED hoặc REJECTED
        if (approvalDto.status != RequestStatus.APPROVED && approvalDto.status != RequestStatus.REJECTED) {
            throw new BadRequestException("Trạng thái phê duyệt không hợp lệ (Chỉ nhận APPROVED/REJECTED)");
        }

        // BẮT BUỘC: Khi từ chối đơn phải có lý do
        if (approvalDto.status == RequestStatus.REJECTED && (approvalDto.decisionNote == null || approvalDto.decisionNote.trim().isEmpty())) {
            throw new BadRequestException("Lý do từ chối là bắt buộc khi từ chối đơn");
        }

        RequestsResponse oldDto = mapToDto(request);

        Employee approverRef = new Employee();
        approverRef.setEmployeeId(approvalDto.approverId);

        request.setStatus(approvalDto.status);
        request.setApprover(approverRef);
        request.setDecisionNote(approvalDto.decisionNote);
        if (approvalDto.status == RequestStatus.APPROVED) {
            request.setHrApprovedAt(LocalDateTime.now());
        }

        Requests savedRequest = requestRepository.save(request);
        RequestsResponse newDto = mapToDto(savedRequest);

        auditLogService.saveAuditLog(approvalDto.status.name(), "REQUEST", requestId, approvalDto.approverId, oldDto,
                newDto);

        return newDto;
    }

    // --- Giữ nguyên các hàm createDraft, submit, update, delete cũ của bạn ---
    // (Lưu ý: Bạn có thể thêm kiểm tra ownership tại delete/update nếu cần bảo mật
    // hơn)

    @Transactional
    public RequestsResponse createDraft(RequestsUpsertRequest input) {
        if (input.title == null || input.title.trim().isEmpty()) {
            throw new BadRequestException("Tiêu đề đơn là bắt buộc");
        }
        if (input.title.length() > 255) {
            throw new BadRequestException("Tiêu đề đơn không được vượt quá 255 ký tự");
        }
        if (input.requestType == null) {
            throw new BadRequestException("Vui lòng chọn loại đơn hợp lệ (LEAVE, OVERTIME, REMOTE, LATE_EARLY)");
        }
        if (input.reason == null || input.reason.trim().isEmpty()) {
            throw new BadRequestException("Lý do tạo đơn là bắt buộc");
        }
        if (input.startDatetime == null || input.endDatetime == null) {
            throw new BadRequestException("Thời gian bắt đầu và thời gian kết thúc là bắt buộc");
        }
        if (input.startDatetime.isAfter(input.endDatetime)) {
            throw new BadRequestException("Thời gian kết thúc phải diễn ra sau hoặc bằng thời gian bắt đầu");
        }

        EmployeeDto empDto = employeeRepository.findById(input.employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        Employee employeeRef = new Employee();
        employeeRef.setEmployeeId(empDto.employeeId);

        Requests entity = new Requests();
        entity.setEmployee(employeeRef);
        entity.setRequestType(input.requestType);
        entity.setTitle(input.title.trim());
        entity.setReason(input.reason.trim());
        entity.setStartDatetime(input.startDatetime);
        entity.setEndDatetime(input.endDatetime);
        entity.setStatus(RequestStatus.DRAFT);

        Requests saved = requestRepository.save(entity);
        RequestsResponse response = mapToDto(saved);
        auditLogService.saveAuditLog("CREATE", "REQUEST", saved.getRequestId(), input.employeeId, null, response);
        return response;
    }

    @Transactional
    public RequestsResponse submit(Long id, Long employeeId) {
        Requests entity = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        // KIỂM TRA QUYỀN: Đơn này có phải của người đang gửi không?
        if (!entity.getEmployee().getEmployeeId().equals(employeeId)) {
            throw new BadRequestException("Bạn không có quyền nộp đơn của người khác");
        }

        if (entity.getStatus() != RequestStatus.DRAFT) {
            throw new IllegalStateException("Chỉ được nộp đơn khi đang ở trạng thái nháp");
        }

        RequestsResponse oldDto = mapToDto(entity);
        entity.setStatus(RequestStatus.SUBMITTED);
        entity.setSubmittedAt(LocalDateTime.now());

        Requests saved = requestRepository.save(entity);
        RequestsResponse newDto = mapToDto(saved);
        auditLogService.saveAuditLog("SUBMIT", "REQUEST", id, employeeId, oldDto, newDto);

        return newDto;
    }

    @Transactional
    public RequestsResponse update(Long requestId, Long employeeId, RequestsUpsertRequest input) {
        Requests request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        // KIỂM TRA QUYỀN: Đơn này có phải của người đang sửa không?
        if (!request.getEmployee().getEmployeeId().equals(employeeId)) {
            throw new BadRequestException("Bạn không có quyền chỉnh sửa đơn của người khác");
        }

        if (request.getStatus() != RequestStatus.DRAFT && request.getStatus() != RequestStatus.SUBMITTED) {
            throw new IllegalStateException("Cannot update request that is already processed");
        }

        if (input.title != null) {
            if (input.title.trim().isEmpty()) throw new BadRequestException("Tiêu đề đơn không được để trống");
            if (input.title.length() > 255) throw new BadRequestException("Tiêu đề đơn không được vượt quá 255 ký tự");
            request.setTitle(input.title.trim());
        }
        if (input.reason != null) {
            if (input.reason.trim().isEmpty()) throw new BadRequestException("Lý do tạo đơn không được để trống");
            request.setReason(input.reason.trim());
        }
        if (input.startDatetime != null && input.endDatetime != null) {
            if (input.startDatetime.isAfter(input.endDatetime)) {
                throw new BadRequestException("Thời gian kết thúc phải diễn ra sau hoặc bằng thời gian bắt đầu");
            }
            request.setStartDatetime(input.startDatetime);
            request.setEndDatetime(input.endDatetime);
        }
        if (input.requestType != null) {
            request.setRequestType(input.requestType);
        }

        RequestsResponse oldDto = mapToDto(request);
        Requests saved = requestRepository.save(request);
        RequestsResponse newDto = mapToDto(saved);
        auditLogService.saveAuditLog("UPDATE", "REQUEST", requestId, employeeId, oldDto, newDto);

        return newDto;
    }

    @Transactional
    public void delete(Long requestId, Long employeeId) {
        Requests request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        if (!request.getEmployee().getEmployeeId().equals(employeeId)) {
            throw new BadRequestException("Bạn không có quyền xóa đơn của người khác");
        }

        if (request.getStatus() != RequestStatus.DRAFT) {
            throw new IllegalStateException("Cannot delete request that is already processed");
        }

        RequestsResponse oldDto = mapToDto(request);
        requestRepository.delete(request);
        auditLogService.saveAuditLog("DELETE", "REQUEST", requestId, employeeId, oldDto, null);
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
        dto.hrDecisionNote = entity.getHrDecisionNote();
        dto.hrApprovedAt = entity.getHrApprovedAt();
        dto.adminApprovedAt = entity.getAdminApprovedAt();

        if (entity.getApprover() != null) {
            dto.approverId = entity.getApprover().getEmployeeId();
            dto.approverName = entity.getApprover().getFullName();
        }
        if (entity.getHrApprover() != null) {
            dto.hrApproverId = entity.getHrApprover().getEmployeeId();
            dto.hrApproverName = entity.getHrApprover().getFullName();
        }
        return dto;
    }
}