package org.example.ams_be.controller;

import org.example.ams_be.dto.request.RequestsApprovalRequest;
import org.example.ams_be.dto.request.RequestsUpsertRequest;
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
        when(requestsService.submit(2L)).thenReturn(submitted);

        ResponseEntity<RequestsResponse> response = controller.submitRequest(2L);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(submitted, response.getBody());
    }

    @Test
    void getMyRequestsReturnsOkList() {
        List<RequestsResponse> expected = List.of(response(3L));
        when(requestsService.getMyRequests(8L)).thenReturn(expected);

        ResponseEntity<List<RequestsResponse>> response = controller.getMyRequests(8L);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(expected, response.getBody());
    }

    @Test
    void updateReturnsOk() {
        RequestsUpsertRequest request = new RequestsUpsertRequest();
        RequestsResponse updated = response(4L);
        when(requestsService.update(4L, request)).thenReturn(updated);

        ResponseEntity<RequestsResponse> response = controller.update(4L, request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(updated, response.getBody());
    }

    @Test
    void deleteReturnsNoContent() {
        ResponseEntity<Void> response = controller.delete(5L);

        assertEquals(204, response.getStatusCode().value());
        verify(requestsService).delete(5L);
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

    private RequestsResponse response(Long id) {
        RequestsResponse response = new RequestsResponse();
        response.requestId = id;
        return response;
    }
}
