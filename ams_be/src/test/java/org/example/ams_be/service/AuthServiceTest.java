package org.example.ams_be.service;

import org.example.ams_be.dto.response.AuthResponse;
import org.example.ams_be.entity.Account;
import org.example.ams_be.entity.Employee;
import org.example.ams_be.entity.Role;
import org.example.ams_be.repository.AccountRepository;
import org.example.ams_be.repository.EmployeeRepository;
import org.example.ams_be.utils.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AccountRepository accountRepo;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private TokenStore tokenStore;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private EmailService emailService;

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private AuthService authService;

    @Test
    void loginThrowsWhenAccountNotFound() {
        when(accountRepo.findByUsername("alice")).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.login("alice", "secret"));

        assertEquals("Invalid username or password", ex.getMessage());
        verifyNoInteractions(passwordEncoder, jwtUtil, tokenStore, auditLogService);
    }

    @Test
    void loginThrowsWhenAccountInactive() {
        when(accountRepo.findByUsername("alice")).thenReturn(Optional.of(account(1L, 100L, "alice", role(1L, "admin"), false)));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.login("alice", "secret"));

        assertEquals("Account is inactive", ex.getMessage());
    }

    @Test
    void loginThrowsWhenPasswordDoesNotMatch() {
        Account account = account(1L, 100L, "alice", role(1L, "admin"), true);
        when(accountRepo.findByUsername("alice")).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("wrong", "hash")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.login("alice", "wrong"));

        assertEquals("Invalid username or password", ex.getMessage());
    }

    @Test
    void loginReturnsTokensStoresRefreshAndWritesAuditLog() {
        Account account = account(1L, 100L, "alice", role(1L, "admin"), true);
        when(accountRepo.findByUsername("alice")).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("secret", "hash")).thenReturn(true);
        when(jwtUtil.generateAccessToken("alice", "ADMIN", 100L)).thenReturn("access");
        when(jwtUtil.generateRefreshToken("alice", "ADMIN", 100L)).thenReturn("refresh");
        when(jwtUtil.getRefreshTtlSeconds()).thenReturn(7200L);
        when(jwtUtil.getAccessTtlSeconds()).thenReturn(3600L);

        AuthResponse response = authService.login("alice", "secret");

        assertEquals("access", response.getAccessToken());
        assertEquals("refresh", response.getRefreshToken());
        assertEquals("alice", response.getUsername());
        assertEquals("ADMIN", response.getRole());
        verify(tokenStore).storeRefreshToken("alice", "refresh", 7200L);
        verify(auditLogService).saveAuditLog(
                org.mockito.ArgumentMatchers.eq("LOGIN"),
                org.mockito.ArgumentMatchers.eq("ACCOUNT"),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(100L),
                org.mockito.ArgumentMatchers.isNull(),
                argThat(payload -> payload instanceof String
                        && payload.toString().contains("\"status\":\"SUCCESS\"")
                        && payload.toString().contains("\"username\":\"alice\""))
        );
    }

    @Test
    void loginUsesEmployeeRoleWhenAccountRoleMissing() {
        Account account = account(1L, 100L, "alice", null, true);
        when(accountRepo.findByUsername("alice")).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("secret", "hash")).thenReturn(true);
        when(jwtUtil.generateAccessToken("alice", "EMPLOYEE", 100L)).thenReturn("access");
        when(jwtUtil.generateRefreshToken("alice", "EMPLOYEE", 100L)).thenReturn("refresh");
        when(jwtUtil.getRefreshTtlSeconds()).thenReturn(7200L);
        when(jwtUtil.getAccessTtlSeconds()).thenReturn(3600L);

        AuthResponse response = authService.login("alice", "secret");

        assertEquals("EMPLOYEE", response.getRole());
        verify(tokenStore).storeRefreshToken("alice", "refresh", 7200L);
    }

    @Test
    void refreshThrowsWhenTokenBlank() {
        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.refresh("  "));

        assertEquals("Invalid refresh token", ex.getMessage());
        verifyNoInteractions(jwtUtil, tokenStore);
    }

    @Test
    void refreshThrowsWhenTokenExpired() {
        when(jwtUtil.isExpired("expired")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.refresh("expired"));

        assertEquals("Invalid refresh token", ex.getMessage());
    }

    @Test
    void refreshThrowsWhenTokenRevoked() {
        when(jwtUtil.isExpired("token")).thenReturn(false);
        when(jwtUtil.getType("token")).thenReturn("refresh");
        when(jwtUtil.getUsername("token")).thenReturn("alice");
        when(jwtUtil.getRole("token")).thenReturn("ADMIN");
        when(jwtUtil.getEmployeeId("token")).thenReturn(100L);
        when(tokenStore.exists("alice", "token")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.refresh("token"));

        assertEquals("Refresh token revoked", ex.getMessage());
    }

    @Test
    void refreshUsesFallbackRoleWhenMissingAndRotatesTokens() {
        when(jwtUtil.isExpired("token")).thenReturn(false);
        when(jwtUtil.getType("token")).thenReturn("refresh");
        when(jwtUtil.getUsername("token")).thenReturn("alice");
        when(jwtUtil.getRole("token")).thenReturn(" ");
        when(jwtUtil.getEmployeeId("token")).thenReturn(100L);
        when(tokenStore.exists("alice", "token")).thenReturn(true);
        when(accountRepo.findByUsername("alice")).thenReturn(Optional.of(account(1L, 100L, "alice", role(1L, "admin"), true)));
        when(jwtUtil.generateRefreshToken("alice", "EMPLOYEE", 100L)).thenReturn("new-refresh");
        when(jwtUtil.generateAccessToken("alice", "EMPLOYEE", 100L)).thenReturn("new-access");
        when(jwtUtil.getRefreshTtlSeconds()).thenReturn(7200L);
        when(jwtUtil.getAccessTtlSeconds()).thenReturn(3600L);

        AuthResponse response = authService.refresh("token");

        assertEquals("new-access", response.getAccessToken());
        assertEquals("new-refresh", response.getRefreshToken());
        assertEquals("EMPLOYEE", response.getRole());
        verify(tokenStore).revoke("alice", "token");
        verify(tokenStore).storeRefreshToken("alice", "new-refresh", 7200L);
    }

    @Test
    void refreshUsesRoleFromTokenWhenPresent() {
        when(jwtUtil.isExpired("token")).thenReturn(false);
        when(jwtUtil.getType("token")).thenReturn("refresh");
        when(jwtUtil.getUsername("token")).thenReturn("alice");
        when(jwtUtil.getRole("token")).thenReturn("MANAGER");
        when(jwtUtil.getEmployeeId("token")).thenReturn(100L);
        when(tokenStore.exists("alice", "token")).thenReturn(true);
        when(accountRepo.findByUsername("alice")).thenReturn(Optional.empty());
        when(jwtUtil.generateRefreshToken("alice", "MANAGER", 100L)).thenReturn("new-refresh");
        when(jwtUtil.generateAccessToken("alice", "MANAGER", 100L)).thenReturn("new-access");
        when(jwtUtil.getRefreshTtlSeconds()).thenReturn(7200L);
        when(jwtUtil.getAccessTtlSeconds()).thenReturn(3600L);

        AuthResponse response = authService.refresh("token");

        assertEquals("MANAGER", response.getRole());
        assertEquals("new-access", response.getAccessToken());
    }

    @Test
    void logoutReturnsImmediatelyWhenTokenInvalid() {
        when(jwtUtil.isExpired("token")).thenReturn(true);

        authService.logout("token");

        verify(tokenStore, never()).revoke(any(), any());
        verifyNoInteractions(accountRepo, auditLogService);
    }

    @Test
    void logoutRevokesTokenWithoutAuditWhenAccountNotFound() {
        when(jwtUtil.isExpired("token")).thenReturn(false);
        when(jwtUtil.getType("token")).thenReturn("refresh");
        when(jwtUtil.getUsername("token")).thenReturn("alice");
        when(accountRepo.findByUsername("alice")).thenReturn(Optional.empty());

        authService.logout("token");

        verify(tokenStore).revoke("alice", "token");
        verifyNoInteractions(auditLogService);
    }

    @Test
    void logoutWritesAuditAndRevokesWhenAccountExists() {
        when(jwtUtil.isExpired("token")).thenReturn(false);
        when(jwtUtil.getType("token")).thenReturn("refresh");
        when(jwtUtil.getUsername("token")).thenReturn("alice");
        when(accountRepo.findByUsername("alice")).thenReturn(Optional.of(account(1L, 100L, "alice", role(1L, "admin"), true)));

        authService.logout("token");

        verify(auditLogService).saveAuditLog("LOGOUT", "ACCOUNT", 1L, 100L, "Username: alice", "Logout successful");
        verify(tokenStore).revoke("alice", "token");
    }

    @Test
    void forgotPasswordGeneratesOtpAndPersistsEncodedOtp() {
        Employee employee = Employee.builder().employeeId(100L).email("alice@example.com").build();
        Account account = account(1L, 100L, "alice", role(1L, "admin"), true);
        when(employeeRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(employee));
        when(accountRepo.findByEmployeeId(100L)).thenReturn(Optional.of(account));
        when(passwordEncoder.encode(any(String.class))).thenReturn("encoded-otp");

        authService.forgotPassword("alice@example.com");

        verify(accountRepo).save(argThat(saved -> "encoded-otp".equals(saved.getResetOtp())
                && saved.getResetOtpExpiredAt() != null
                && saved.getResetOtpAttemptCount() == 0));
        verify(emailService).sendOtpEmail(org.mockito.ArgumentMatchers.eq("alice@example.com"), any(String.class));
    }

    @Test
    void verifyOtpThrowsWhenOtpInvalidAndIncrementsAttemptCount() {
        Employee employee = Employee.builder().employeeId(100L).email("alice@example.com").build();
        Account account = account(1L, 100L, "alice", role(1L, "admin"), true);
        account.setResetOtp("encoded-otp");
        account.setResetOtpExpiredAt(LocalDateTime.now().plusMinutes(5));
        account.setResetOtpAttemptCount(0);
        when(employeeRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(employee));
        when(accountRepo.findByEmployeeId(100L)).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("123456", "encoded-otp")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.verifyOtp("alice@example.com", "123456"));

        org.junit.jupiter.api.Assertions.assertTrue(ex.getMessage().contains("OTP"));
        verify(accountRepo).save(argThat(saved -> saved.getResetOtpAttemptCount() == 1));
    }

    private Account account(Long accountId, Long employeeId, String username, Role role, boolean active) {
        return Account.builder()
                .accountId(accountId)
                .employeeId(employeeId)
                .username(username)
                .passwordHash("hash")
                .role(role)
                .isActive(active)
                .build();
    }

    private Role role(Long roleId, String roleCode) {
        return Role.builder()
                .roleId(roleId)
                .roleCode(roleCode)
                .roleName(roleCode)
                .build();
    }
}
