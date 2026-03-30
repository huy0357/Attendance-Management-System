package org.example.ams_be.service;

import org.example.ams_be.dto.AccountDto;
import org.example.ams_be.dto.request.CreateAccountRequest;
import org.example.ams_be.dto.request.PageRequestDto;
import org.example.ams_be.dto.request.UpdateAccountRequest;
import org.example.ams_be.dto.response.AccountResponse;
import org.example.ams_be.dto.response.PageResponse;
import org.example.ams_be.entity.Account;
import org.example.ams_be.entity.Role;
import org.example.ams_be.exception.NotFoundException;
import org.example.ams_be.repository.AccountRepository;
import org.example.ams_be.repository.RoleRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AccountService accountService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createAccountThrowsWhenEmployeeIdMissing() {
        CreateAccountRequest req = createRequest();
        req.setEmployeeId(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> accountService.createAccount(req));

        assertEquals("employeeId is required", ex.getMessage());
        verifyNoInteractions(accountRepository, roleRepository, passwordEncoder);
    }

    @Test
    void createAccountThrowsWhenRoleIdMissing() {
        CreateAccountRequest req = createRequest();
        req.setRoleId(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> accountService.createAccount(req));

        assertEquals("roleId is required", ex.getMessage());
        verifyNoInteractions(accountRepository, roleRepository, passwordEncoder);
    }

    @Test
    void createAccountThrowsWhenUsernameAlreadyExists() {
        CreateAccountRequest req = createRequest();
        when(accountRepository.existsByUsername("alice")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> accountService.createAccount(req));

        assertEquals("username already exists", ex.getMessage());
        verify(accountRepository, never()).save(any());
    }

    @Test
    void createAccountThrowsWhenRoleNotFound() {
        CreateAccountRequest req = createRequest();
        when(accountRepository.existsByUsername("alice")).thenReturn(false);
        when(accountRepository.existsByEmployeeId(1L)).thenReturn(false);
        when(roleRepository.findById(10L)).thenReturn(Optional.empty());

        NotFoundException ex = assertThrows(NotFoundException.class, () -> accountService.createAccount(req));

        assertEquals("Role not found: 10", ex.getMessage());
    }

    @Test
    void createAccountUsesRoleFromRepositoryAndReturnsResponse() {
        CreateAccountRequest req = createRequest();
        Role role = role(10L, "ADMIN");
        when(accountRepository.existsByUsername("alice")).thenReturn(false);
        when(accountRepository.existsByEmployeeId(1L)).thenReturn(false);
        when(roleRepository.findById(10L)).thenReturn(Optional.of(role));
        when(passwordEncoder.encode("secret1")).thenReturn("hashed");
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> {
            Account saved = invocation.getArgument(0);
            saved.setAccountId(99L);
            saved.setCreatedAt(LocalDateTime.of(2026, 3, 18, 9, 0));
            return saved;
        });

        AccountResponse response = accountService.createAccount(req);

        ArgumentCaptor<Account> captor = ArgumentCaptor.forClass(Account.class);
        verify(accountRepository).save(captor.capture());
        assertEquals(role, captor.getValue().getRole());
        assertEquals("hashed", captor.getValue().getPasswordHash());
        assertEquals(99L, response.getAccountId());
        assertEquals(10L, response.getRoleId());
        assertEquals("ADMIN", response.getRoleCode());
        assertTrue(response.getIsActive());
        verify(auditLogService).saveAuditLog("CREATE", "ACCOUNT", 99L, null, null, response);
    }

    @Test
    void getAllAccountsMapsEntitiesToDtos() {
        when(accountRepository.findAll()).thenReturn(List.of(account(1L, "alice", role(10L, "ADMIN"), true)));

        List<AccountDto> result = accountService.getAllAccounts();

        assertEquals(1, result.size());
        assertEquals("alice", result.get(0).getUsername());
        assertEquals(10L, result.get(0).getRoleId());
        assertEquals("ADMIN", result.get(0).getRoleCode());
    }

    @Test
    void getAccountByIdReturnsMappedDtoWhenFound() {
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account(1L, "alice", role(10L, "ADMIN"), true)));

        AccountDto result = accountService.getAccountById(1L);

        assertEquals(1L, result.getAccountId());
        assertEquals("alice", result.getUsername());
        assertEquals("ADMIN", result.getRoleCode());
        assertTrue(result.getIsActive());
    }

    @Test
    void updateThrowsWhenAccountMissing() {
        when(accountRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> accountService.update(1L, new UpdateAccountRequest()));
    }

    @Test
    void updateThrowsWhenRoleNotFound() {
        UpdateAccountRequest req = UpdateAccountRequest.builder().roleId(99L).build();
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account(1L, "alice", role(10L, "ADMIN"), true)));
        when(roleRepository.findById(99L)).thenReturn(Optional.empty());

        NotFoundException ex = assertThrows(NotFoundException.class, () -> accountService.update(1L, req));

        assertEquals("Role not found: 99", ex.getMessage());
    }

    @Test
    void updateMutatesFieldsAndReturnsDto() {
        UpdateAccountRequest req = UpdateAccountRequest.builder()
                .username("bob")
                .roleId(20L)
                .isActive(false)
                .build();
        Account existing = account(1L, "alice", role(10L, "ADMIN"), true);
        Role newRole = role(20L, "MANAGER");
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(accountRepository.existsByUsername("bob")).thenReturn(false);
        when(roleRepository.findById(20L)).thenReturn(Optional.of(newRole));
        when(accountRepository.save(existing)).thenAnswer(invocation -> invocation.getArgument(0));

        AccountDto result = accountService.update(1L, req);

        assertEquals("bob", result.getUsername());
        assertEquals(20L, result.getRoleId());
        assertEquals("MANAGER", result.getRoleCode());
        assertFalse(result.getIsActive());
        verify(auditLogService).saveAuditLog(
                org.mockito.ArgumentMatchers.eq("UPDATE"),
                org.mockito.ArgumentMatchers.eq("ACCOUNT"),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.isNull(),
                any(AccountDto.class),
                any(AccountDto.class)
        );
    }

    @Test
    void updateSkipsDuplicateCheckWhenUsernameUnchanged() {
        UpdateAccountRequest req = UpdateAccountRequest.builder().username("alice").build();
        Account existing = account(1L, "alice", role(10L, "ADMIN"), true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(accountRepository.save(existing)).thenAnswer(invocation -> invocation.getArgument(0));

        AccountDto result = accountService.update(1L, req);

        assertEquals("alice", result.getUsername());
        verify(accountRepository, never()).existsByUsername(any());
    }

    @Test
    void deleteThrowsWhenAccountNotFound() {
        when(accountRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> accountService.delete(99L));
    }

    @Test
    void deleteRemovesAccountAndWritesAudit() {
        Account existing = account(10L, "alice", role(10L, "ADMIN"), true);
        when(accountRepository.findById(10L)).thenReturn(Optional.of(existing));

        accountService.delete(10L);

        verify(accountRepository).delete(existing);
        verify(auditLogService).saveAuditLog(
                org.mockito.ArgumentMatchers.eq("DELETE"),
                org.mockito.ArgumentMatchers.eq("ACCOUNT"),
                org.mockito.ArgumentMatchers.eq(10L),
                org.mockito.ArgumentMatchers.isNull(),
                any(AccountDto.class),
                org.mockito.ArgumentMatchers.isNull()
        );
    }

    @Test
    void getAccountsPageUsesDefaultsAndActiveFilter() {
        PageRequestDto req = new PageRequestDto();
        Pageable pageable = PageRequest.of(0, 10, Sort.by("accountId").descending());
        when(accountRepository.findAllByIsActive(true, pageable))
                .thenReturn(new PageImpl<>(List.of(account(1L, "alice", role(10L, "ADMIN"), true)), pageable, 1));

        PageResponse<AccountDto> response = accountService.getAccountsPage(req, true);

        assertEquals(1, response.page);
        assertEquals(10, response.size);
        assertEquals(1, response.totalItems);
        assertEquals("alice", response.items.get(0).getUsername());
    }

    @Test
    void getAccountsPageNormalizesInvalidPagingAndBlankSortValues() {
        PageRequestDto req = new PageRequestDto();
        req.page = 0;
        req.size = 0;
        req.sortBy = " ";
        req.sortDir = " ";
        Pageable pageable = PageRequest.of(0, 10, Sort.by("accountId").descending());
        when(accountRepository.findAll(pageable))
                .thenReturn(new PageImpl<>(List.of(account(4L, "dave", null, true)), pageable, 1));

        PageResponse<AccountDto> response = accountService.getAccountsPage(req, null);

        assertEquals(1, response.page);
        assertEquals(10, response.size);
        assertNull(response.items.get(0).getRoleCode());
        verify(accountRepository).findAll(pageable);
    }

    @Test
    void searchAccountsByUsernameUsesProvidedPagingAndSorting() {
        PageRequestDto req = new PageRequestDto();
        req.page = 2;
        req.size = 5;
        req.sortBy = "username";
        req.sortDir = "asc";
        Pageable pageable = PageRequest.of(1, 5, Sort.by("username").ascending());
        when(accountRepository.findByUsernameContainingIgnoreCase("ali", pageable))
                .thenReturn(new PageImpl<>(List.of(account(1L, "alice", role(10L, "ADMIN"), true)), pageable, 6));

        PageResponse<AccountDto> response = accountService.searchAccountsByUsername(req, "ali");

        assertEquals(2, response.page);
        assertEquals(5, response.size);
        assertEquals(6, response.totalItems);
        assertTrue(response.hasPrev);
        assertFalse(response.hasNext);
    }

    private CreateAccountRequest createRequest() {
        return CreateAccountRequest.builder()
                .employeeId(1L)
                .username("alice")
                .password("secret1")
                .roleId(10L)
                .isActive(true)
                .build();
    }

    private Account account(Long id, String username, Role role, boolean isActive) {
        return Account.builder()
                .accountId(id)
                .employeeId(1L)
                .username(username)
                .passwordHash("hash")
                .role(role)
                .isActive(isActive)
                .lastLoginAt(LocalDateTime.of(2026, 3, 18, 8, 0))
                .createdAt(LocalDateTime.of(2026, 3, 1, 8, 0))
                .updatedAt(LocalDateTime.of(2026, 3, 2, 8, 0))
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
