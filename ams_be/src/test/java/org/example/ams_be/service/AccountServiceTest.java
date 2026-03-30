package org.example.ams_be.service;

import org.example.ams_be.dto.AccountDto;
import org.example.ams_be.dto.request.CreateAccountRequest;
import org.example.ams_be.dto.request.PageRequestDto;
import org.example.ams_be.dto.request.UpdateAccountRequest;
import org.example.ams_be.dto.response.AccountResponse;
import org.example.ams_be.dto.response.PageResponse;
import org.example.ams_be.entity.Account;
import org.example.ams_be.exception.NotFoundException;
import org.example.ams_be.repository.AccountRepository;
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
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AccountService accountService;

    @Test
    void createAccountThrowsWhenEmployeeIdMissing() {
        CreateAccountRequest req = createRequest();
        req.setEmployeeId(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> accountService.createAccount(req));

        assertEquals("employeeId is required", ex.getMessage());
        verifyNoInteractions(accountRepository, passwordEncoder);
    }

    @Test
    void createAccountThrowsWhenPasswordInvalid() {
        CreateAccountRequest req = createRequest();
        req.setPassword("123");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> accountService.createAccount(req));

        assertEquals("password is required (min 6 chars)", ex.getMessage());
    }

    @Test
    void createAccountThrowsWhenPasswordMissing() {
        CreateAccountRequest req = createRequest();
        req.setPassword(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> accountService.createAccount(req));

        assertEquals("password is required (min 6 chars)", ex.getMessage());
        verifyNoInteractions(accountRepository, passwordEncoder);
    }

    @Test
    void createAccountThrowsWhenUsernameBlank() {
        CreateAccountRequest req = createRequest();
        req.setUsername(" ");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> accountService.createAccount(req));

        assertEquals("username is required", ex.getMessage());
        verifyNoInteractions(accountRepository, passwordEncoder);
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
    void createAccountThrowsWhenEmployeeAlreadyHasAccount() {
        CreateAccountRequest req = createRequest();
        when(accountRepository.existsByUsername("alice")).thenReturn(false);
        when(accountRepository.existsByEmployeeId(1L)).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> accountService.createAccount(req));

        assertEquals("employee already has an account", ex.getMessage());
    }

    @Test
    void createAccountAppliesDefaultRoleAndActiveAndEncodesPassword() {
        CreateAccountRequest req = createRequest();
        req.setRole(null);
        req.setIsActive(null);
        when(accountRepository.existsByUsername("alice")).thenReturn(false);
        when(accountRepository.existsByEmployeeId(1L)).thenReturn(false);
        when(passwordEncoder.encode("secret1")).thenReturn("hashed");
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> {
            Account saved = invocation.getArgument(0);
            saved.setAccountId(10L);
            saved.setCreatedAt(LocalDateTime.of(2026, 3, 18, 9, 0));
            return saved;
        });

        AccountResponse response = accountService.createAccount(req);

        ArgumentCaptor<Account> captor = ArgumentCaptor.forClass(Account.class);
        verify(accountRepository).save(captor.capture());
        assertEquals(Account.Role.employee, captor.getValue().getRole());
        assertTrue(captor.getValue().getIsActive());
        assertEquals("hashed", captor.getValue().getPasswordHash());
        verify(passwordEncoder).encode("secret1");
        assertEquals(10L, response.getAccountId());
        assertEquals(Account.Role.employee, response.getRole());
        assertTrue(response.getIsActive());
    }

    @Test
    void createAccountKeepsProvidedRoleAndInactiveFlag() {
        CreateAccountRequest req = createRequest();
        req.setRole(Account.Role.manager);
        req.setIsActive(false);
        when(accountRepository.existsByUsername("alice")).thenReturn(false);
        when(accountRepository.existsByEmployeeId(1L)).thenReturn(false);
        when(passwordEncoder.encode("secret1")).thenReturn("hashed");
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> {
            Account saved = invocation.getArgument(0);
            saved.setAccountId(11L);
            return saved;
        });

        AccountResponse response = accountService.createAccount(req);

        ArgumentCaptor<Account> captor = ArgumentCaptor.forClass(Account.class);
        verify(accountRepository).save(captor.capture());
        assertEquals(Account.Role.manager, captor.getValue().getRole());
        assertFalse(captor.getValue().getIsActive());
        assertEquals(Account.Role.manager, response.getRole());
        assertFalse(response.getIsActive());
    }

    @Test
    void getAllAccountsMapsEntitiesToDtos() {
        when(accountRepository.findAll()).thenReturn(List.of(account(1L, "alice", Account.Role.admin, true)));

        List<AccountDto> result = accountService.getAllAccounts();

        assertEquals(1, result.size());
        assertEquals("alice", result.get(0).getUsername());
        assertEquals("admin", result.get(0).getRole());
    }

    @Test
    void getAccountByIdThrowsWhenNotFound() {
        when(accountRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> accountService.getAccountById(99L));
    }

    @Test
    void getAccountByIdReturnsMappedDtoWhenFound() {
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account(1L, "alice", Account.Role.admin, true)));

        AccountDto result = accountService.getAccountById(1L);

        assertEquals(1L, result.getAccountId());
        assertEquals("alice", result.getUsername());
        assertEquals("admin", result.getRole());
        assertTrue(result.getIsActive());
    }

    @Test
    void updateThrowsWhenUsernameDuplicate() {
        UpdateAccountRequest req = new UpdateAccountRequest();
        req.setUsername("bob");
        Account existing = account(1L, "alice", Account.Role.employee, true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(accountRepository.existsByUsername("bob")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> accountService.update(1L, req));

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
        req.setRole(Account.Role.manager);
        req.setIsActive(false);
        Account existing = account(1L, "alice", Account.Role.employee, true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(accountRepository.existsByUsername("bob")).thenReturn(false);

        AccountDto result = accountService.update(1L, req);

        assertEquals("bob", result.getUsername());
        assertEquals("manager", result.getRole());
        assertFalse(result.getIsActive());
        assertNotNull(result.getUpdatedAt());
    }

    @Test
    void updateSkipsUsernameLookupWhenBlankAndLeavesOptionalFieldsUntouched() {
        UpdateAccountRequest req = new UpdateAccountRequest();
        req.setUsername(" ");
        Account existing = account(1L, "alice", Account.Role.employee, true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existing));

        AccountDto result = accountService.update(1L, req);

        assertEquals("alice", result.getUsername());
        assertEquals("employee", result.getRole());
        assertTrue(result.getIsActive());
        verify(accountRepository, never()).existsByUsername(any());
    }

    @Test
    void updateSkipsDuplicateCheckWhenUsernameUnchanged() {
        UpdateAccountRequest req = new UpdateAccountRequest();
        req.setUsername("alice");
        Account existing = account(1L, "alice", Account.Role.employee, true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existing));

        AccountDto result = accountService.update(1L, req);

        assertEquals("alice", result.getUsername());
        verify(accountRepository, never()).existsByUsername(any());
    }

    @Test
    void deleteThrowsWhenAccountNotFound() {
        when(accountRepository.existsById(99L)).thenReturn(false);

        assertThrows(NotFoundException.class, () -> accountService.delete(99L));
    }

    @Test
    void deleteRemovesAccountWhenFound() {
        when(accountRepository.existsById(10L)).thenReturn(true);

        accountService.delete(10L);

        verify(accountRepository).deleteById(10L);
    }

    @Test
    void getAccountsPageUsesDefaultsAndActiveFilter() {
        PageRequestDto req = new PageRequestDto();
        Pageable pageable = PageRequest.of(0, 10, Sort.by("accountId").descending());
        when(accountRepository.findAllByIsActive(true, pageable))
                .thenReturn(new PageImpl<>(List.of(account(1L, "alice", Account.Role.admin, true)), pageable, 1));

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
                .thenReturn(new PageImpl<>(List.of(account(2L, "bob", Account.Role.employee, false)), pageable, 1));

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
                .thenReturn(new PageImpl<>(List.of(account(2L, "bob", Account.Role.employee, false)), pageable, 7));

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
        assertEquals(null, response.items.get(0).getRole());
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
                .thenReturn(new PageImpl<>(List.of(account(1L, "alice", Account.Role.admin, true)), pageable, 6));

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
        assertEquals(null, response.items.get(0).getRole());
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
                .thenReturn(new PageImpl<>(List.of(account(5L, "adam", Account.Role.manager, true)), pageable, 1));

        PageResponse<AccountDto> response = accountService.searchAccountsByUsername(req, "adm");

        assertEquals(1, response.page);
        assertEquals(10, response.size);
        assertEquals("manager", response.items.get(0).getRole());
    }

    private CreateAccountRequest createRequest() {
        return CreateAccountRequest.builder()
                .employeeId(1L)
                .username("alice")
                .password("secret1")
                .role(Account.Role.admin)
                .isActive(true)
                .build();
    }

    private Account account(Long id, String username, Account.Role role, boolean isActive) {
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
}
