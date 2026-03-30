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
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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

    @Test
    void createAccountThrowsWhenEmployeeIdMissing() {
        CreateAccountRequest req = createRequest();
        req.setEmployeeId(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> accountService.createAccount(req));

        assertEquals("employeeId is required", ex.getMessage());
        verifyNoInteractions(accountRepository, roleRepository, passwordEncoder);
    }

    @Test
    void createAccountThrowsWhenPasswordInvalid() {
        CreateAccountRequest req = createRequest();
        req.setPassword("123");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> accountService.createAccount(req));

        assertEquals("password is required (min 6 chars)", ex.getMessage());
    }

    @Test
    void createAccountThrowsWhenPasswordMissing() {
        CreateAccountRequest req = createRequest();
        req.setPassword(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> accountService.createAccount(req));

        assertEquals("password is required (min 6 chars)", ex.getMessage());
        verifyNoInteractions(accountRepository, roleRepository, passwordEncoder);
    }

    @Test
    void createAccountThrowsWhenUsernameBlank() {
        CreateAccountRequest req = createRequest();
        req.setUsername(" ");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> accountService.createAccount(req));

        assertEquals("username is required", ex.getMessage());
        verifyNoInteractions(accountRepository, roleRepository, passwordEncoder);
    }

    @Test
    void createAccountThrowsWhenUsernameAlreadyExists() {
        CreateAccountRequest req = createRequest();
        when(accountRepository.existsByUsername("alice")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> accountService.createAccount(req));

        assertEquals("username already exists", ex.getMessage());
        verify(accountRepository, never()).save(any());
    }

    @Test
    void createAccountThrowsWhenEmployeeAlreadyHasAccount() {
        CreateAccountRequest req = createRequest();
        when(accountRepository.existsByUsername("alice")).thenReturn(false);
        when(accountRepository.existsByEmployeeId(1L)).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> accountService.createAccount(req));

        assertEquals("employee already has an account", ex.getMessage());
    }

    @Test
    void createAccountThrowsWhenRoleIdMissing() {
        CreateAccountRequest req = createRequest();
        req.setRoleId(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> accountService.createAccount(req));

        assertEquals("roleId is required", ex.getMessage());
    }

    @Test
    void createAccountUsesProvidedRoleIdAndActiveFlagAndEncodesPassword() {
        CreateAccountRequest req = createRequest();
        req.setRoleId(2L);
        req.setIsActive(false);
        Role managerRole = role(2L, "manager");
        when(accountRepository.existsByUsername("alice")).thenReturn(false);
        when(accountRepository.existsByEmployeeId(1L)).thenReturn(false);
        when(roleRepository.findById(2L)).thenReturn(Optional.of(managerRole));
        when(passwordEncoder.encode("secret1")).thenReturn("hashed");
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> {
            Account saved = invocation.getArgument(0);
            saved.setAccountId(11L);
            saved.setCreatedAt(LocalDateTime.of(2026, 3, 18, 9, 0));
            return saved;
        });

        AccountResponse response = accountService.createAccount(req);

        ArgumentCaptor<Account> captor = ArgumentCaptor.forClass(Account.class);
        verify(accountRepository).save(captor.capture());
        assertEquals(2L, captor.getValue().getRole().getRoleId());
        assertEquals("manager", captor.getValue().getRole().getRoleCode());
        assertFalse(captor.getValue().getIsActive());
        assertEquals("hashed", captor.getValue().getPasswordHash());
        verify(passwordEncoder).encode("secret1");
        assertEquals(11L, response.getAccountId());
        assertEquals(2L, response.getRoleId());
        assertEquals("manager", response.getRoleCode());
        assertFalse(response.getIsActive());
    }

    @Test
    void getAllAccountsMapsEntitiesToDtos() {
        when(accountRepository.findAll()).thenReturn(List.of(account(1L, "alice", role(1L, "admin"), true)));

        List<AccountDto> result = accountService.getAllAccounts();

        assertEquals(1, result.size());
        assertEquals("alice", result.get(0).getUsername());
        assertEquals(1L, result.get(0).getRoleId());
        assertEquals("admin", result.get(0).getRoleCode());
    }

    @Test
    void getAccountByIdThrowsWhenNotFound() {
        when(accountRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> accountService.getAccountById(99L));
    }

    @Test
    void getAccountByIdReturnsMappedDtoWhenFound() {
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account(1L, "alice", role(1L, "admin"), true)));

        AccountDto result = accountService.getAccountById(1L);

        assertEquals(1L, result.getAccountId());
        assertEquals("alice", result.getUsername());
        assertEquals(1L, result.getRoleId());
        assertEquals("admin", result.getRoleCode());
        assertTrue(result.getIsActive());
    }

    @Test
    void updateThrowsWhenUsernameDuplicate() {
        UpdateAccountRequest req = new UpdateAccountRequest();
        req.setUsername("bob");
        Account existing = account(1L, "alice", role(3L, "employee"), true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(accountRepository.existsByUsername("bob")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> accountService.update(1L, req));

        assertEquals("username already exists", ex.getMessage());
    }

    @Test
    void updateThrowsWhenAccountMissing() {
        when(accountRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> accountService.update(1L, new UpdateAccountRequest()));
    }

    @Test
    void updateMutatesFieldsAndReturnsDto() {
        UpdateAccountRequest req = new UpdateAccountRequest();
        req.setUsername("bob");
        req.setRoleId(2L);
        req.setIsActive(false);
        Account existing = account(1L, "alice", role(3L, "employee"), true);
        Role managerRole = role(2L, "manager");
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(accountRepository.existsByUsername("bob")).thenReturn(false);
        when(roleRepository.findById(2L)).thenReturn(Optional.of(managerRole));
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> {
            Account saved = invocation.getArgument(0);
            saved.setUpdatedAt(LocalDateTime.of(2026, 3, 18, 10, 0));
            return saved;
        });

        AccountDto result = accountService.update(1L, req);

        assertEquals("bob", result.getUsername());
        assertEquals(2L, result.getRoleId());
        assertEquals("manager", result.getRoleCode());
        assertFalse(result.getIsActive());
        assertNotNull(result.getUpdatedAt());
    }

    @Test
    void updateSkipsUsernameLookupWhenBlankAndLeavesOptionalFieldsUntouched() {
        UpdateAccountRequest req = new UpdateAccountRequest();
        req.setUsername(" ");
        Account existing = account(1L, "alice", role(3L, "employee"), true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AccountDto result = accountService.update(1L, req);

        assertEquals("alice", result.getUsername());
        assertEquals(3L, result.getRoleId());
        assertEquals("employee", result.getRoleCode());
        assertTrue(result.getIsActive());
        verify(accountRepository, never()).existsByUsername(any());
    }

    @Test
    void updateSkipsDuplicateCheckWhenUsernameUnchanged() {
        UpdateAccountRequest req = new UpdateAccountRequest();
        req.setUsername("alice");
        Account existing = account(1L, "alice", role(3L, "employee"), true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

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
    void deleteRemovesAccountWhenFound() {
        Account existing = account(10L, "alice", role(1L, "admin"), true);
        when(accountRepository.findById(10L)).thenReturn(Optional.of(existing));

        accountService.delete(10L);

        verify(accountRepository).delete(existing);
    }

    @Test
    void getAccountsPageUsesDefaultsAndActiveFilter() {
        PageRequestDto req = new PageRequestDto();
        Pageable pageable = PageRequest.of(0, 10, Sort.by("accountId").descending());
        when(accountRepository.findAllByIsActive(true, pageable))
                .thenReturn(new PageImpl<>(List.of(account(1L, "alice", role(1L, "admin"), true)), pageable, 1));

        PageResponse<AccountDto> response = accountService.getAccountsPage(req, true);

        assertEquals(1, response.page);
        assertEquals(10, response.size);
        assertEquals(1, response.totalItems);
        assertEquals("alice", response.items.get(0).getUsername());
    }

    @Test
    void getAccountsPageUsesFindAllWhenActiveFilterMissing() {
        PageRequestDto req = new PageRequestDto();
        Pageable pageable = PageRequest.of(0, 10, Sort.by("accountId").descending());
        when(accountRepository.findAll(pageable))

                .thenReturn(new PageImpl<>(List.of(account(2L, "bob", "employee", false)), pageable, 1));


        PageResponse<AccountDto> response = accountService.getAccountsPage(req, null);

        assertEquals(1, response.page);
        assertEquals("bob", response.items.get(0).getUsername());
        verify(accountRepository).findAll(pageable);
    }

    @Test
    void getAccountsPageUsesProvidedPagingAndAscendingSortForInactiveFilter() {
        PageRequestDto req = new PageRequestDto();
        req.page = 2;
        req.size = 3;
        req.sortBy = "username";
        req.sortDir = "asc";
        Pageable pageable = PageRequest.of(1, 3, Sort.by("username").ascending());
        when(accountRepository.findAllByIsActive(false, pageable))

                .thenReturn(new PageImpl<>(List.of(account(2L, "bob", "employee", false)), pageable, 7));


        PageResponse<AccountDto> response = accountService.getAccountsPage(req, false);

        assertEquals(2, response.page);
        assertEquals(3, response.size);
        assertEquals(7, response.totalItems);
        assertEquals("bob", response.items.get(0).getUsername());
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
                .thenReturn(new PageImpl<>(List.of(account(4L, "dave", (String) null, true)), pageable, 1));

        PageResponse<AccountDto> response = accountService.getAccountsPage(req, null);

        assertEquals(1, response.page);
        assertEquals(10, response.size);

        assertEquals(null, response.items.get(0).getRoleCode());

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

                .thenReturn(new PageImpl<>(List.of(account(1L, "alice", "admin", true)), pageable, 6));


        PageResponse<AccountDto> response = accountService.searchAccountsByUsername(req, "ali");

        assertEquals(2, response.page);
        assertEquals(5, response.size);
        assertEquals(6, response.totalItems);
        assertTrue(response.hasPrev);
        assertFalse(response.hasNext);
    }

    @Test
    void searchAccountsByUsernameUsesDefaultDescendingSort() {
        PageRequestDto req = new PageRequestDto();
        Pageable pageable = PageRequest.of(0, 10, Sort.by("accountId").descending());
        when(accountRepository.findByUsernameContainingIgnoreCase("adm", pageable))
                .thenReturn(new PageImpl<>(List.of(account(3L, "admin", (String) null, true)), pageable, 1));

        PageResponse<AccountDto> response = accountService.searchAccountsByUsername(req, "adm");

        assertEquals(1, response.page);
        assertEquals("admin", response.items.get(0).getUsername());

        assertEquals(null, response.items.get(0).getRoleCode());

    }

    @Test
    void searchAccountsByUsernameNormalizesInvalidPagingAndBlankSortValues() {
        PageRequestDto req = new PageRequestDto();
        req.page = -1;
        req.size = 0;
        req.sortBy = " ";
        req.sortDir = " ";
        Pageable pageable = PageRequest.of(0, 10, Sort.by("accountId").descending());
        when(accountRepository.findByUsernameContainingIgnoreCase("adm", pageable))

                .thenReturn(new PageImpl<>(List.of(account(5L, "adam", "manager", true)), pageable, 1));


        PageResponse<AccountDto> response = accountService.searchAccountsByUsername(req, "adm");

        assertEquals(1, response.page);
        assertEquals(10, response.size);
        assertEquals("manager", response.items.get(0).getRoleCode());
    }

    private CreateAccountRequest createRequest() {
        return CreateAccountRequest.builder()
                .employeeId(1L)
                .username("alice")
                .password("secret1")

                .roleId(3L)

                .isActive(true)
                .build();
    }


    private Account account(Long id, String username, String roleCode, boolean isActive) {
        Role role = roleCode != null ? Role.builder().roleId(1L).roleCode(roleCode).build() : null;

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

    private Role role(Long id, String code) {
        return Role.builder()
                .roleId(id)
                .roleCode(code)
                .roleName(code.toUpperCase())
                .build();
    }
}
