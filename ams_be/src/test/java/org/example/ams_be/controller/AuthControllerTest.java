package org.example.ams_be.controller;

import org.example.ams_be.dto.request.LoginRequest;
import org.example.ams_be.dto.request.LogoutRequest;
import org.example.ams_be.dto.request.RefreshRequest;
import org.example.ams_be.dto.response.ApiResponse;
import org.example.ams_be.dto.response.AuthResponse;
import org.example.ams_be.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController controller;

    @Test
    void loginReturnsOkBodyFromService() {
        LoginRequest request = new LoginRequest();
        request.setUsername("alice");
        request.setPassword("secret");
        AuthResponse authResponse = new AuthResponse("access", "refresh", 3600L, "alice", "admin");
        when(authService.login("alice", "secret")).thenReturn(authResponse);

        ResponseEntity<ApiResponse<AuthResponse>> response = controller.login(request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(authResponse, response.getBody().getData());
    }

    @Test
    void refreshReturnsOkBodyFromService() {
        RefreshRequest request = new RefreshRequest();
        request.setRefreshToken("refresh");
        AuthResponse authResponse = new AuthResponse("access-2", "refresh-2", 3600L, "alice", "employee");
        when(authService.refresh("refresh")).thenReturn(authResponse);

        ResponseEntity<ApiResponse<AuthResponse>> response = controller.refresh(request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(authResponse, response.getBody().getData());
    }

    @Test
    void logoutReturnsNoContent() {
        LogoutRequest request = new LogoutRequest();
        request.setRefreshToken("refresh");

        ResponseEntity<ApiResponse<Void>> response = controller.logout(request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(null, response.getBody().getData());
        verify(authService).logout("refresh");
    }
}
