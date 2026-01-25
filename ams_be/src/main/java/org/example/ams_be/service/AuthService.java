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

    public AuthService(AccountRepository accountRepo,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       TokenStore tokenStore) {
        this.accountRepo = accountRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.tokenStore = tokenStore;
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

        return new AuthResponse(access, refresh, jwtUtil.getAccessTtlSeconds(), username, role);
    }


    public AuthResponse refresh(String refreshToken) {
        // 1) Validate JWT format/type/expiry
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new RuntimeException("Invalid refresh token");
        }

        // parse/validate: nếu token sai chữ ký/format thì jwtUtil.parseClaims sẽ ném exception
        // (tuỳ implementation jwtUtil của bạn; hiện jwtUtil.isExpired() có catch JwtException -> true)
        if (jwtUtil.isExpired(refreshToken)) {
            throw new RuntimeException("Invalid refresh token");
        }
        if (!"refresh".equals(jwtUtil.getType(refreshToken))) {
            throw new RuntimeException("Invalid refresh token");
        }

        // 2) Extract subject + role
        String username = jwtUtil.getUsername(refreshToken);
        String role = jwtUtil.getRole(refreshToken);
        if (username == null || username.isBlank()) {
            throw new RuntimeException("Invalid refresh token");
        }
        if (role == null || role.isBlank()) {
            // fallback nếu role không có trong token (tuỳ bạn)
            role = "employee";
        }

        // 3) Check token còn “sống” trong Redis (chưa bị revoke)
        if (!tokenStore.exists(username, refreshToken)) {
            // request refresh token cũ / đã logout / đã rotate
            throw new RuntimeException("Refresh token revoked");
        }

        // 4) Rotation: revoke cũ trước, rồi phát mới
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
        tokenStore.revoke(username, refreshToken);
    }
}
