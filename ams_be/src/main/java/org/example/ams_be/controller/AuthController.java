package org.example.ams_be.controller;

import jakarta.validation.Valid;
import org.example.ams_be.dto.request.LoginRequest;
import org.example.ams_be.dto.request.LogoutRequest;
import org.example.ams_be.dto.request.RefreshRequest;
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
}
