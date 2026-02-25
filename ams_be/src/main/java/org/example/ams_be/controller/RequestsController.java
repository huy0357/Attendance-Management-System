package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.request.RequestsApprovalRequest;
import org.example.ams_be.dto.request.RequestsUpsertRequest;
import org.example.ams_be.dto.response.RequestsResponse;
import org.example.ams_be.service.RequestsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/requests") // Định nghĩa đường dẫn gốc: http://localhost:8080/api/requests
@RequiredArgsConstructor
public class RequestsController {

    private final RequestsService requestsService;

    /**
     * 1A. Tạo đơn mới
     * URL: POST /api/requests
     */
    @PostMapping
    public ResponseEntity<RequestsResponse> create(@RequestBody RequestsUpsertRequest request) {
        RequestsResponse createdRequest = requestsService.createDraft(request);
        // Trả về mã 201 Created
        return ResponseEntity.status(HttpStatus.CREATED).body(createdRequest);
    }
    
    /**
     * 1B. Chuyển trạng thái đã nộp
     * URL: POST /api/requests
     */
    @PutMapping("/{id}/submit")
    public ResponseEntity<RequestsResponse> submitRequest(@PathVariable("id") Long id) {
        return ResponseEntity.ok(requestsService.submit(id));
    }
    /**
     * 2. Lấy danh sách đơn của cá nhân
     * URL: GET /api/requests?employeeId=1
     */
    @GetMapping
    public ResponseEntity<List<RequestsResponse>> getMyRequests(@RequestParam("employeeId") Long employeeId) {
        // Gọi service lấy list đơn
        return ResponseEntity.ok(requestsService.getMyRequests(employeeId));
    }

    /**
     * 3. Cập nhật đơn (Chỉ update khi đang PENDING)
     * URL: PUT /api/requests/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<RequestsResponse> update(
            @PathVariable("id") Long id,
            @RequestBody RequestsUpsertRequest request) {
        return ResponseEntity.ok(requestsService.update(id, request));
    }

    /**
     * 4. Xóa đơn (Chỉ xóa khi đang PENDING)
     * URL: DELETE /api/requests/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") Long id) {
        requestsService.delete(id);
        // Trả về 204 No Content (Thành công nhưng không có body)
        return ResponseEntity.noContent().build();
    }

    /**
     * 5. Duyệt hoặc Từ chối đơn (Dành cho Quản lý)
     * URL: PUT /api/requests/{id}/approval
     */
    @PutMapping("/{id}/approval")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<RequestsResponse> approveOrReject(
            @PathVariable("id") Long id,
            @RequestBody RequestsApprovalRequest request) {
        return ResponseEntity.ok(requestsService.approveOrReject(id, request));
    }
}