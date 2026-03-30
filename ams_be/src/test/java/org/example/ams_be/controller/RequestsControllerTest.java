package org.example.ams_be.controller;

import org.example.ams_be.dto.request.RequestsApprovalRequest;
import org.example.ams_be.dto.request.RequestsUpsertRequest;
import org.example.ams_be.dto.response.PageResponse;
import org.example.ams_be.dto.response.RequestsResponse;
import org.example.ams_be.enums.RequestStatus;
import org.example.ams_be.service.RequestsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RequestsControllerTest {

    @Mock
    private RequestsService requestsService;

    @InjectMocks
    private RequestsController controller;

    @Test
    void createReturnsCreatedResponse() {
        RequestsUpsertRequest request = new RequestsUpsertRequest();
        RequestsResponse created = response(1L);
        when(requestsService.createDraft(request)).thenReturn(created);

        ResponseEntity<RequestsResponse> response = controller.create(request);

        assertEquals(201, response.getStatusCode().value());
        assertEquals(created, response.getBody());
    }

    @Test
    void submitRequestReturnsOk() {
        RequestsResponse submitted = response(2L);
        Long empId = 8L; // Giả định empId
        // Cập nhật: Service submit giờ nhận 2 tham số (id, employeeId)
        when(requestsService.submit(2L, empId)).thenReturn(submitted);

        ResponseEntity<RequestsResponse> response = controller.submitRequest(2L, empId);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(submitted, response.getBody());
    }

    @Test
    void getMyRequestsReturnsOkPage() {
        // Cập nhật: Chuyển từ List sang PageResponse
        List<RequestsResponse> content = List.of(response(3L));
        PageResponse<RequestsResponse> expectedPage = new PageResponse<>(content, 1, 10, 1L);

        // Cập nhật param cho khớp getMyRequestsPaged trong Service
        when(requestsService.getMyRequestsPaged(eq(8L), any(), any(), eq(1), eq(10)))
                .thenReturn(expectedPage);

        ResponseEntity<PageResponse<RequestsResponse>> response = controller.getMyRequests(8L, null, null, 1, 10);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(expectedPage, response.getBody());
    }

    @Test
    void updateReturnsOk() {
        RequestsUpsertRequest request = new RequestsUpsertRequest();
        RequestsResponse updated = response(4L);
        Long empId = 8L;
        // Cập nhật: Service update giờ nhận 3 tham số
        when(requestsService.update(4L, empId, request)).thenReturn(updated);

        ResponseEntity<RequestsResponse> response = controller.update(4L, empId, request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(updated, response.getBody());
    }

    @Test
    void deleteReturnsNoContent() {
        Long requestId = 5L;
        Long empId = 8L;

        ResponseEntity<Void> response = controller.delete(requestId, empId);

        assertEquals(24, response.getStatusCode().value()); // 204 No Content
        // Cập nhật: Verify theo tham số mới
        verify(requestsService).delete(requestId, empId);
    }

    @Test
    void approveOrRejectReturnsOk() {
        RequestsApprovalRequest request = new RequestsApprovalRequest();
        request.approverId = 9L;
        request.status = RequestStatus.REJECTED;
        RequestsResponse decided = response(6L);
        when(requestsService.approveOrReject(6L, request)).thenReturn(decided);

        ResponseEntity<RequestsResponse> response = controller.approveOrReject(6L, request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(decided, response.getBody());
    }

    @Test
    void getByIdReturnsOk() {
        RequestsResponse expected = response(7L);
        when(requestsService.getRequestById(7L)).thenReturn(expected);

        ResponseEntity<RequestsResponse> response = controller.getById(7L);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(expected, response.getBody());
    }

    private RequestsResponse response(Long id) {
        RequestsResponse response = new RequestsResponse();
        response.requestId = id;
        return response;
    }
}