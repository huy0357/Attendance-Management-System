package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.request.RequestsApprovalRequest;
import org.example.ams_be.dto.request.RequestsUpsertRequest;
import org.example.ams_be.dto.response.PageResponse;
import org.example.ams_be.dto.response.RequestsResponse;
import org.example.ams_be.enums.RequestStatus;
import org.example.ams_be.enums.RequestType;
import org.example.ams_be.service.RequestsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/requests")
@RequiredArgsConstructor
public class RequestsController {

    private final RequestsService requestsService;

    /**
     * 1. Lấy chi tiết đơn
     * GET /api/requests/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<RequestsResponse> getById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(requestsService.getRequestById(id));
    }

    /**
     * 2. Lấy danh sách cá nhân (MY REQUESTS) - Nâng cấp Paging & Filter
     * GET /api/requests?employeeId=1&status=SUBMITTED&type=OVERTIME&page=1&size=10
     */
    @GetMapping
    public ResponseEntity<PageResponse<RequestsResponse>> getMyRequests(
            @RequestParam("employeeId") Long employeeId,
            @RequestParam(value = "status", required = false) RequestStatus status,
            @RequestParam(value = "type", required = false) RequestType type,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        return ResponseEntity.ok(requestsService.getMyRequestsPaged(employeeId, status, type, page, size));
    }

    /**
     * 3. Hàng đợi cho Manager (Manager Queue)
     * GET /api/requests/manager-queue?managerId=8&status=SUBMITTED
     */
    @GetMapping("/manager-queue")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<PageResponse<RequestsResponse>> getManagerQueue(
            @RequestParam("managerId") Long managerId,
            @RequestParam(value = "status", required = false) RequestStatus status,
            @RequestParam(value = "type", required = false) RequestType type,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        return ResponseEntity.ok(requestsService.getManagerQueue(managerId, status, type, page, size));
    }

    /**
     * 4. Quản lý toàn cục (Dành cho ADMIN/HR)
     * GET /api/requests/all?type=OVERTIME
     */
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN') or hasRole('HR')")
    public ResponseEntity<PageResponse<RequestsResponse>> getAllRequests(
            @RequestParam(value = "status", required = false) RequestStatus status,
            @RequestParam(value = "type", required = false) RequestType type,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        return ResponseEntity.ok(requestsService.getAllGlobal(status, type, page, size));
    }

    /**
     * 5. Tạo đơn mới (DRAFT)
     */
    @PostMapping
    public ResponseEntity<RequestsResponse> create(@RequestBody RequestsUpsertRequest request) {
        RequestsResponse createdRequest = requestsService.createDraft(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdRequest);
    }

    /**
     * 6. Chuyển trạng thái nộp đơn c(SUBMITTED). Quản lý chỉ có thể duyệt đơn khi trạng thái = SUBMITTED
     */
    @PutMapping("/{id}/submit")
    public ResponseEntity<RequestsResponse> submitRequest(
            @PathVariable("id") Long id,
            @RequestParam("employeeId") Long employeeId) { 
        return ResponseEntity.ok(requestsService.submit(id, employeeId));
    }

    /**
     * 7. Cập nhật đơn
     */
    @PutMapping("/{id}")
    public ResponseEntity<RequestsResponse> update(
            @PathVariable("id") Long id,
            @RequestParam("employeeId") Long employeeId,
            @RequestBody RequestsUpsertRequest request) {
        return ResponseEntity.ok(requestsService.update(id, employeeId, request));
    }

    /**
     * 8. Xóa đơn
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable("id") Long id,
            @RequestParam("employeeId") Long employeeId) {
        requestsService.delete(id, employeeId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 9. Duyệt hoặc Từ chối đơn
     */
    @PutMapping("/{id}/approval")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<RequestsResponse> approveOrReject(
            @PathVariable("id") Long id,
            @RequestBody RequestsApprovalRequest request) {
        return ResponseEntity.ok(requestsService.approveOrReject(id, request));
    }
}