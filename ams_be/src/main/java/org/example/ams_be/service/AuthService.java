package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.response.AuthResponse;
import org.example.ams_be.entity.Account;
import org.example.ams_be.entity.Employee;
import org.example.ams_be.entity.Role;
import org.example.ams_be.repository.AccountRepository;
import org.example.ams_be.repository.EmployeeRepository;
import org.example.ams_be.repository.RoleRepository;
import org.example.ams_be.utils.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AccountRepository accountRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final TokenStore tokenStore;
    private final AuditLogService auditLogService;
    private final EmailService emailService;
    private final EmployeeRepository employeeRepository;
    private final RoleRepository roleRepository;

    private String resolveRoleCode(Account acc) {
        if (acc.getRole() == null) {
            return "EMPLOYEE";
        }

        return acc.getRole().getRoleCode().toUpperCase();
    }


    public AuthResponse login(String username, String password) {
        Account acc = accountRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Invalid username or password"));

        if (Boolean.FALSE.equals(acc.getIsActive())) {
            throw new RuntimeException("Account is inactive");
        }

        if (!passwordEncoder.matches(password, acc.getPasswordHash())) {
            throw new RuntimeException("Invalid username or password");
        }

        String roleCode = resolveRoleCode(acc);

        String accessToken = jwtUtil.generateAccessToken(
                acc.getUsername(),
                roleCode,
                acc.getEmployeeId()
        );

        String refreshToken = jwtUtil.generateRefreshToken(
                acc.getUsername(),
                roleCode,
                acc.getEmployeeId()
        );

        tokenStore.storeRefreshToken(
                acc.getUsername(),
                refreshToken,
                jwtUtil.getRefreshTtlSeconds()
        );

        auditLogService.saveAuditLog(
                "LOGIN",
                "ACCOUNT",
                acc.getAccountId(),
                acc.getEmployeeId(),
                null,
                "Login successful"
        );

        return new AuthResponse(
                accessToken,
                refreshToken,
                jwtUtil.getAccessTtlSeconds(),
                acc.getUsername(),
                roleCode
        );
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
        String roleCode = jwtUtil.getRole(refreshToken);
        Long employeeId = jwtUtil.getEmployeeId(refreshToken);

        if (username == null || username.isBlank()) {
            throw new RuntimeException("Invalid refresh token");
        }

        if (roleCode == null || roleCode.isBlank()) {
            roleCode = "EMPLOYEE";
        }

        if (!tokenStore.exists(username, refreshToken)) {
            throw new RuntimeException("Refresh token revoked");
        }

        Account acc = accountRepo.findByUsername(username).orElse(null);
        if (acc != null) {
            auditLogService.saveAuditLog(
                    "REFRESH_TOKEN",
                    "ACCOUNT",
                    acc.getAccountId(),
                    acc.getEmployeeId(),
                    "Old token rotated",
                    "New token issued"
            );
        }

        tokenStore.revoke(username, refreshToken);

        String newRefreshToken = jwtUtil.generateRefreshToken(
                username,
                roleCode,
                employeeId
        );

        tokenStore.storeRefreshToken(
                username,
                newRefreshToken,
                jwtUtil.getRefreshTtlSeconds()
        );

        String newAccessToken = jwtUtil.generateAccessToken(
                username,
                roleCode,
                employeeId
        );

        return new AuthResponse(
                newAccessToken,
                newRefreshToken,
                jwtUtil.getAccessTtlSeconds(),
                username,
                roleCode
        );
    }

    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }

        if (jwtUtil.isExpired(refreshToken) || !"refresh".equals(jwtUtil.getType(refreshToken))) {
            return;
        }

        String username = jwtUtil.getUsername(refreshToken);
        Account acc = accountRepo.findByUsername(username).orElse(null);

        if (acc != null) {
            auditLogService.saveAuditLog(
                    "LOGOUT",
                    "ACCOUNT",
                    acc.getAccountId(),
                    acc.getEmployeeId(),
                    "Username: " + username,
                    "Logout successful"
            );
        }

        tokenStore.revoke(username, refreshToken);
    }

    public void forgotPassword(String email) {
        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email không tồn tại trong hệ thống"));

        Account account = accountRepo.findByEmployeeId(employee.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại"));

        if (Boolean.FALSE.equals(account.getIsActive())) {
            throw new RuntimeException("Tài khoản đã bị vô hiệu hóa");
        }

        String rawOtp = generateOtp();
        String encodedOtp = passwordEncoder.encode(rawOtp);

        account.setResetOtp(encodedOtp);
        account.setResetOtpExpiredAt(LocalDateTime.now().plusMinutes(5));
        account.setResetOtpAttemptCount(0);

        accountRepo.save(account);

        emailService.sendOtpEmail(email, rawOtp);
    }

    public void verifyOtp(String email, String otp) {
        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email không tồn tại trong hệ thống"));

        Account account = accountRepo.findByEmployeeId(employee.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại"));

        validateOtp(account, otp);
    }

    public void resetPassword(String email, String otp, String newPassword) {
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new RuntimeException("Mật khẩu mới phải có ít nhất 6 ký tự");
        }

        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email không tồn tại trong hệ thống"));

        Account account = accountRepo.findByEmployeeId(employee.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại"));

        validateOtp(account, otp);

        account.setPasswordHash(passwordEncoder.encode(newPassword));
        account.setResetOtp(null);
        account.setResetOtpExpiredAt(null);
        account.setResetOtpAttemptCount(0);

        accountRepo.save(account);
    }

    private void validateOtp(Account account, String otp) {
        if (account.getResetOtp() == null || account.getResetOtpExpiredAt() == null) {
            throw new RuntimeException("OTP không tồn tại");
        }

        if (LocalDateTime.now().isAfter(account.getResetOtpExpiredAt())) {
            throw new RuntimeException("OTP đã hết hạn");
        }

        int currentAttempts = account.getResetOtpAttemptCount() == null
                ? 0
                : account.getResetOtpAttemptCount();

        if (currentAttempts >= 5) {
            throw new RuntimeException("Bạn đã nhập sai OTP quá 5 lần");
        }

        if (!passwordEncoder.matches(otp, account.getResetOtp())) {
            account.setResetOtpAttemptCount(currentAttempts + 1);
            accountRepo.save(account);
            throw new RuntimeException("OTP không đúng");
        }
    }

    private String generateOtp() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }
}