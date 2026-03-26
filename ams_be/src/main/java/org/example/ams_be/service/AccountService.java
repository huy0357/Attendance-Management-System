package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    private Long getCurrentActorId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }

        return accountRepository.findByUsername(auth.getName())
                .map(Account::getEmployeeId)
                .orElse(null);
    }

    private Role getRoleOrThrow(Long roleId) {
        if (roleId == null) {
            throw new IllegalArgumentException("roleId is required");
        }

        return roleRepository.findById(roleId)
                .orElseThrow(() -> new NotFoundException("Role not found: " + roleId));
    }

    private String resolveRoleCode(Role role) {
        return role != null ? role.getRoleCode() : null;
    }

    @Transactional
    public AccountResponse createAccount(CreateAccountRequest req) {
        if (req.getEmployeeId() == null) {
            throw new IllegalArgumentException("employeeId is required");
        }
        if (!StringUtils.hasText(req.getUsername())) {
            throw new IllegalArgumentException("username is required");
        }
        if (!StringUtils.hasText(req.getPassword()) || req.getPassword().length() < 6) {
            throw new IllegalArgumentException("password is required (min 6 chars)");
        }
        if (req.getRoleId() == null) {
            throw new IllegalArgumentException("roleId is required");
        }

        if (accountRepository.existsByUsername(req.getUsername())) {
            throw new IllegalArgumentException("username already exists");
        }
        if (accountRepository.existsByEmployeeId(req.getEmployeeId())) {
            throw new IllegalArgumentException("employee already has an account");
        }

        Role role = getRoleOrThrow(req.getRoleId());
        String hash = passwordEncoder.encode(req.getPassword());

        Account account = Account.builder()
                .employeeId(req.getEmployeeId())
                .username(req.getUsername())
                .passwordHash(hash)
                .role(role)
                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                .build();

        Account saved = accountRepository.save(account);

        AccountResponse response = AccountResponse.builder()
                .accountId(saved.getAccountId())
                .employeeId(saved.getEmployeeId())
                .username(saved.getUsername())
                .roleId(saved.getRole() != null ? saved.getRole().getRoleId() : null)
                .roleCode(resolveRoleCode(saved.getRole()))
                .isActive(saved.getIsActive())
                .createdAt(saved.getCreatedAt())
                .build();

        auditLogService.saveAuditLog(
                "CREATE",
                "ACCOUNT",
                saved.getAccountId(),
                getCurrentActorId(),
                null,
                response
        );

        return response;
    }

    @Transactional
    public AccountDto update(Long id, UpdateAccountRequest req) {
        Account acc = accountRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Account not found: " + id));

        AccountDto oldData = toDto(acc);

        if (StringUtils.hasText(req.getUsername()) && !req.getUsername().equals(acc.getUsername())) {
            if (accountRepository.existsByUsername(req.getUsername())) {
                throw new IllegalArgumentException("username already exists");
            }
            acc.setUsername(req.getUsername());
        }

        if (req.getRoleId() != null) {
            Role role = getRoleOrThrow(req.getRoleId());
            acc.setRole(role);
        }

        if (req.getIsActive() != null) {
            acc.setIsActive(req.getIsActive());
        }

        Account saved = accountRepository.save(acc);
        AccountDto newData = toDto(saved);

        auditLogService.saveAuditLog(
                "UPDATE",
                "ACCOUNT",
                id,
                getCurrentActorId(),
                oldData,
                newData
        );

        return newData;
    }

    @Transactional
    public void delete(Long id) {
        Account acc = accountRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Account not found: " + id));

        AccountDto oldData = toDto(acc);

        accountRepository.delete(acc);

        auditLogService.saveAuditLog(
                "DELETE",
                "ACCOUNT",
                id,
                getCurrentActorId(),
                oldData,
                null
        );
    }

    public List<AccountDto> getAllAccounts() {
        return accountRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    public AccountDto getAccountById(Long id) {
        Account acc = accountRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Account not found: " + id));
        return toDto(acc);
    }

    public PageResponse<AccountDto> getAccountsPage(PageRequestDto req, Boolean isActive) {
        int page = (req.page == null || req.page < 1) ? 1 : req.page;
        int size = (req.size == null || req.size <= 0) ? 10 : req.size;
        String sortBy = (req.sortBy == null || req.sortBy.isBlank()) ? "accountId" : req.sortBy;
        String sortDir = (req.sortDir == null || req.sortDir.isBlank()) ? "desc" : req.sortDir;

        Sort sort = "desc".equalsIgnoreCase(sortDir)
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = org.springframework.data.domain.PageRequest.of(page - 1, size, sort);

        Page<Account> pageData = (isActive == null)
                ? accountRepository.findAll(pageable)
                : accountRepository.findAllByIsActive(isActive, pageable);

        return new PageResponse<>(
                pageData.getContent().stream().map(this::toDto).toList(),
                page,
                size,
                pageData.getTotalElements()
        );
    }

    public PageResponse<AccountDto> searchAccountsByUsername(PageRequestDto req, String username) {
        int page = (req.page == null || req.page < 1) ? 1 : req.page;
        int size = (req.size == null || req.size <= 0) ? 10 : req.size;
        String sortBy = (req.sortBy == null || req.sortBy.isBlank()) ? "accountId" : req.sortBy;
        String sortDir = (req.sortDir == null || req.sortDir.isBlank()) ? "desc" : req.sortDir;

        Sort sort = "desc".equalsIgnoreCase(sortDir)
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = org.springframework.data.domain.PageRequest.of(page - 1, size, sort);

        Page<Account> pageData = accountRepository.findByUsernameContainingIgnoreCase(username, pageable);

        return new PageResponse<>(
                pageData.getContent().stream().map(this::toDto).toList(),
                page,
                size,
                pageData.getTotalElements()
        );
    }

    private AccountDto toDto(Account a) {
        return AccountDto.builder()
                .accountId(a.getAccountId())
                .employeeId(a.getEmployeeId())
                .username(a.getUsername())
                .roleId(a.getRole() != null ? a.getRole().getRoleId() : null)
                .roleCode(resolveRoleCode(a.getRole()))
                .isActive(a.getIsActive())
                .lastLoginAt(a.getLastLoginAt())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}