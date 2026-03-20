package org.example.ams_be.service;

import org.example.ams_be.dto.response.AuthResponse;
import org.example.ams_be.entity.Account;
import org.example.ams_be.repository.AccountRepository;
import org.example.ams_be.utils.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AccountRepository accountRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final TokenStore tokenStore;
    private final AuditLogService auditLogService;

    public AuthService(AccountRepository accountRepo,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       TokenStore tokenStore,
                       AuditLogService auditLogService) {
        this.accountRepo = accountRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.tokenStore = tokenStore;
        this.auditLogService = auditLogService;
    }

    public AuthResponse login(String username, String password) {
        Account acc = accountRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Invalid username or password"));

        // isActive là Boolean -> check như này
        if (Boolean.FALSE.equals(acc.getIsActive())) {
            throw new RuntimeException("Account is inactive");
        }


        String hashed = acc.getPasswordHash();

        if (!passwordEncoder.matches(password, hashed)) {
            throw new RuntimeException("Invalid username or password");
        }

        // role là enum Account.Role -> convert sang String
        String role = (acc.getRole() == null) ? "employee" : acc.getRole().name().toLowerCase();

        String access = jwtUtil.generateAccessToken(username, role);
        String refresh = jwtUtil.generateRefreshToken(username, role);

        tokenStore.storeRefreshToken(username, refresh, jwtUtil.getRefreshTtlSeconds());

        Long empId = acc.getEmployeeId();
        auditLogService.saveAuditLog("LOGIN", "ACCOUNT", acc.getAccountId(), empId, null, "Login successful");
        
        AuthResponse response = new AuthResponse(access, refresh, jwtUtil.getAccessTtlSeconds(), username, role);
        return response;
    }


    public AuthResponse refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new RuntimeException("Invalid refresh token");
        }

        if (jwtUtil.isExpired(refreshToken)) {
            throw new RuntimeException("Invalid refresh token");
        }
        if (!"refresh".equals(jwtUtil.getType(refreshToken))) {
            throw new RuntimeException("Invalid refresh token");
        }

        String username = jwtUtil.getUsername(refreshToken);
        String role = jwtUtil.getRole(refreshToken);
        if (username == null || username.isBlank()) {
            throw new RuntimeException("Invalid refresh token");
        }
        if (role == null || role.isBlank()) {
            role = "employee";
        }

        if (!tokenStore.exists(username, refreshToken)) {
            throw new RuntimeException("Refresh token revoked");
        }

        // Bổ sung ghi log REFRESH_TOKEN
        Account acc = accountRepo.findByUsername(username).orElse(null);
        if (acc != null) {
            auditLogService.saveAuditLog(
                    "REFRESH_TOKEN",
                    "ACCOUNT",
                    acc.getAccountId(),
                    acc.getEmployeeId(),
                    "Old token rotated",
                    "New token issued");
        }

        tokenStore.revoke(username, refreshToken);

        String newRefresh = jwtUtil.generateRefreshToken(username, role);
        tokenStore.storeRefreshToken(username, newRefresh, jwtUtil.getRefreshTtlSeconds());

        String newAccess = jwtUtil.generateAccessToken(username, role);

        return new AuthResponse(newAccess, newRefresh, jwtUtil.getAccessTtlSeconds(), username, role);
    }


    public void logout(String refreshToken) {
        if (jwtUtil.isExpired(refreshToken) || !"refresh".equals(jwtUtil.getType(refreshToken))) {
            return;
        }
        String username = jwtUtil.getUsername(refreshToken);
        Account acc = accountRepo.findByUsername(username).orElse(null);
        if (acc != null) {
            Long actorId = (acc.getEmployeeId() != null) ? acc.getEmployeeId() : null;
            auditLogService.saveAuditLog(
                    "LOGOUT",
                    "ACCOUNT",
                    acc.getAccountId(),
                    actorId,
                    "Username: " + username,
                    "Logout successful");
        }
        tokenStore.revoke(username, refreshToken);
    }
}
