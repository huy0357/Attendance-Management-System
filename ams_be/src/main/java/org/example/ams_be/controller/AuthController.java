package org.example.ams_be.controller;

import jakarta.validation.Valid;
import org.example.ams_be.dto.request.*;
import org.example.ams_be.dto.response.ApiResponse;
import org.example.ams_be.dto.response.AuthResponse;
import org.example.ams_be.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // AMS-132
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req.getUsername(), req.getPassword()));
    }

    // AMS-134
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest req) {
        return ResponseEntity.ok(authService.refresh(req.getRefreshToken()));
    }

    // AMS-135
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody LogoutRequest req) {
        authService.logout(req.getRefreshToken());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(new ApiResponse("OTP đã được gửi về email"));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse> verifyOtp(@RequestBody VerifyOtpRequest request) {
        authService.verifyOtp(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(new ApiResponse("OTP hợp lệ"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse> resetPassword(@RequestBody ResetPasswordRequest request) {
        authService.resetPassword(
                request.getEmail(),
                request.getOtp(),
                request.getNewPassword()
        );
        return ResponseEntity.ok(new ApiResponse("Đổi mật khẩu thành công"));
    }
}
