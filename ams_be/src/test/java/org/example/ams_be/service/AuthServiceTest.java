package org.example.ams_be.service;

import org.example.ams_be.dto.response.AuthResponse;
import org.example.ams_be.entity.Account;
import org.example.ams_be.repository.AccountRepository;
import org.example.ams_be.utils.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
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
        Account account = account(1L, "alice", Account.Role.admin, false);
        when(accountRepo.findByUsername("alice")).thenReturn(Optional.of(account));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.login("alice", "secret"));

        assertEquals("Account is inactive", ex.getMessage());
    }

    @Test
    void loginThrowsWhenPasswordDoesNotMatch() {
        Account account = account(1L, "alice", Account.Role.admin, true);
        when(accountRepo.findByUsername("alice")).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("wrong", "hash")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.login("alice", "wrong"));

        assertEquals("Invalid username or password", ex.getMessage());
    }

    @Test
    void loginReturnsTokensStoresRefreshAndWritesAuditLog() {
        Account account = account(1L, "alice", Account.Role.admin, true);
        when(accountRepo.findByUsername("alice")).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("secret", "hash")).thenReturn(true);
        when(jwtUtil.generateAccessToken("alice", "admin")).thenReturn("access");
        when(jwtUtil.generateRefreshToken("alice", "admin")).thenReturn("refresh");
        when(jwtUtil.getRefreshTtlSeconds()).thenReturn(7200L);
        when(jwtUtil.getAccessTtlSeconds()).thenReturn(3600L);

        AuthResponse response = authService.login("alice", "secret");

        assertEquals("access", response.getAccessToken());
        assertEquals("refresh", response.getRefreshToken());
        assertEquals("alice", response.getUsername());
        assertEquals("admin", response.getRole());
        verify(tokenStore).storeRefreshToken("alice", "refresh", 7200L);
        verify(auditLogService).saveAuditLog("LOGIN", "ACCOUNT", 1L, 100L, null, "Login successful");
    }

    @Test
    void loginUsesEmployeeRoleWhenAccountRoleMissing() {
        Account account = account(1L, "alice", null, true);
        when(accountRepo.findByUsername("alice")).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("secret", "hash")).thenReturn(true);
        when(jwtUtil.generateAccessToken("alice", "employee")).thenReturn("access");
        when(jwtUtil.generateRefreshToken("alice", "employee")).thenReturn("refresh");
        when(jwtUtil.getRefreshTtlSeconds()).thenReturn(7200L);
        when(jwtUtil.getAccessTtlSeconds()).thenReturn(3600L);

        AuthResponse response = authService.login("alice", "secret");

        assertEquals("employee", response.getRole());
        verify(tokenStore).storeRefreshToken("alice", "refresh", 7200L);
    }

    @Test
    void refreshThrowsWhenTokenBlank() {
        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.refresh("  "));

        assertEquals("Invalid refresh token", ex.getMessage());
        verifyNoInteractions(jwtUtil, tokenStore);
    }

    @Test
    void refreshThrowsWhenTokenIsNull() {
        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.refresh(null));

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
    void refreshThrowsWhenTypeIsNotRefresh() {
        when(jwtUtil.isExpired("token")).thenReturn(false);
        when(jwtUtil.getType("token")).thenReturn("access");

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.refresh("token"));

        assertEquals("Invalid refresh token", ex.getMessage());
    }

    @Test
    void refreshThrowsWhenTokenRevoked() {
        when(jwtUtil.isExpired("token")).thenReturn(false);
        when(jwtUtil.getType("token")).thenReturn("refresh");
        when(jwtUtil.getUsername("token")).thenReturn("alice");
        when(jwtUtil.getRole("token")).thenReturn("admin");
        when(tokenStore.exists("alice", "token")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.refresh("token"));

        assertEquals("Refresh token revoked", ex.getMessage());
    }

    @Test
    void refreshThrowsWhenParsedUsernameBlank() {
        when(jwtUtil.isExpired("token")).thenReturn(false);
        when(jwtUtil.getType("token")).thenReturn("refresh");
        when(jwtUtil.getUsername("token")).thenReturn(" ");

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.refresh("token"));

        assertEquals("Invalid refresh token", ex.getMessage());
    }

    @Test
    void refreshThrowsWhenParsedUsernameIsNull() {
        when(jwtUtil.isExpired("token")).thenReturn(false);
        when(jwtUtil.getType("token")).thenReturn("refresh");
        when(jwtUtil.getUsername("token")).thenReturn(null);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.refresh("token"));

        assertEquals("Invalid refresh token", ex.getMessage());
    }

    @Test
    void refreshUsesFallbackRoleWhenMissingAndRotatesTokens() {
        when(jwtUtil.isExpired("token")).thenReturn(false);
        when(jwtUtil.getType("token")).thenReturn("refresh");
        when(jwtUtil.getUsername("token")).thenReturn("alice");
        when(jwtUtil.getRole("token")).thenReturn(" ");
        when(tokenStore.exists("alice", "token")).thenReturn(true);
        when(jwtUtil.generateRefreshToken("alice", "employee")).thenReturn("new-refresh");
        when(jwtUtil.generateAccessToken("alice", "employee")).thenReturn("new-access");
        when(jwtUtil.getRefreshTtlSeconds()).thenReturn(7200L);
        when(jwtUtil.getAccessTtlSeconds()).thenReturn(3600L);

        AuthResponse response = authService.refresh("token");

        assertEquals("new-access", response.getAccessToken());
        assertEquals("new-refresh", response.getRefreshToken());
        assertEquals("employee", response.getRole());
        verify(tokenStore).revoke("alice", "token");
        verify(tokenStore).storeRefreshToken("alice", "new-refresh", 7200L);
    }

    @Test
    void refreshUsesFallbackRoleWhenRoleIsNull() {
        when(jwtUtil.isExpired("token")).thenReturn(false);
        when(jwtUtil.getType("token")).thenReturn("refresh");
        when(jwtUtil.getUsername("token")).thenReturn("alice");
        when(jwtUtil.getRole("token")).thenReturn(null);
        when(tokenStore.exists("alice", "token")).thenReturn(true);
        when(jwtUtil.generateRefreshToken("alice", "employee")).thenReturn("new-refresh");
        when(jwtUtil.generateAccessToken("alice", "employee")).thenReturn("new-access");
        when(jwtUtil.getRefreshTtlSeconds()).thenReturn(7200L);
        when(jwtUtil.getAccessTtlSeconds()).thenReturn(3600L);

        AuthResponse response = authService.refresh("token");

        assertEquals("employee", response.getRole());
    }

    @Test
    void refreshUsesRoleFromTokenWhenPresent() {
        when(jwtUtil.isExpired("token")).thenReturn(false);
        when(jwtUtil.getType("token")).thenReturn("refresh");
        when(jwtUtil.getUsername("token")).thenReturn("alice");
        when(jwtUtil.getRole("token")).thenReturn("manager");
        when(tokenStore.exists("alice", "token")).thenReturn(true);
        when(jwtUtil.generateRefreshToken("alice", "manager")).thenReturn("new-refresh");
        when(jwtUtil.generateAccessToken("alice", "manager")).thenReturn("new-access");
        when(jwtUtil.getRefreshTtlSeconds()).thenReturn(7200L);
        when(jwtUtil.getAccessTtlSeconds()).thenReturn(3600L);

        AuthResponse response = authService.refresh("token");

        assertEquals("manager", response.getRole());
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
    void logoutReturnsImmediatelyWhenTokenTypeIsNotRefresh() {
        when(jwtUtil.isExpired("token")).thenReturn(false);
        when(jwtUtil.getType("token")).thenReturn("access");

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
        Account account = account(1L, "alice", Account.Role.admin, true);
        when(jwtUtil.isExpired("token")).thenReturn(false);
        when(jwtUtil.getType("token")).thenReturn("refresh");
        when(jwtUtil.getUsername("token")).thenReturn("alice");
        when(accountRepo.findByUsername("alice")).thenReturn(Optional.of(account));

        authService.logout("token");

        verify(auditLogService).saveAuditLog("LOGOUT", "ACCOUNT", 1L, 100L, "Username: alice", "Logout successful");
        verify(tokenStore).revoke("alice", "token");
    }

    @Test
    void logoutWritesAuditWithNullActorWhenEmployeeIdMissing() {
        Account account = account(1L, "alice", Account.Role.admin, true);
        account.setEmployeeId(null);
        when(jwtUtil.isExpired("token")).thenReturn(false);
        when(jwtUtil.getType("token")).thenReturn("refresh");
        when(jwtUtil.getUsername("token")).thenReturn("alice");
        when(accountRepo.findByUsername("alice")).thenReturn(Optional.of(account));

        authService.logout("token");

        verify(auditLogService).saveAuditLog("LOGOUT", "ACCOUNT", 1L, null, "Username: alice", "Logout successful");
        verify(tokenStore).revoke("alice", "token");
    }

    private Account account(Long accountId, String username, Account.Role role, boolean active) {
        return Account.builder()
                .accountId(accountId)
                .employeeId(100L)
                .username(username)
                .passwordHash("hash")
                .role(role)
                .isActive(active)
                .build();
    }
}
