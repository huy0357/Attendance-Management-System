package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.AccountDto;
import org.example.ams_be.dto.request.CreateAccountRequest;
import org.example.ams_be.dto.request.PageRequestDto;
import org.example.ams_be.dto.request.UpdateAccountRequest;
import org.example.ams_be.dto.response.AccountResponse;
import org.example.ams_be.dto.response.PageResponse;
import org.example.ams_be.entity.Account;
import org.example.ams_be.exception.NotFoundException;
import org.example.ams_be.repository.AccountRepository;
import org.springframework.data.domain.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    // ===== CREATE =====
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
        if (req.getRole() == null) {
            req.setRole(Account.Role.employee);
        }

        if (accountRepository.existsByUsername(req.getUsername())) {
            throw new IllegalArgumentException("username already exists");
        }
        if (accountRepository.existsByEmployeeId(req.getEmployeeId())) {
            throw new IllegalArgumentException("employee already has an account");
        }

        String hash = passwordEncoder.encode(req.getPassword());

        Account account = Account.builder()
                .employeeId(req.getEmployeeId())
                .username(req.getUsername())
                .passwordHash(hash)
                .role(req.getRole())
                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                .build();

        Account saved = accountRepository.save(account);

        return AccountResponse.builder()
                .accountId(saved.getAccountId())
                .employeeId(saved.getEmployeeId())
                .username(saved.getUsername())
                .role(saved.getRole())
                .isActive(saved.getIsActive())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    // ===== VIEW =====
    public List<AccountDto> getAllAccounts() {
        return accountRepository.findAll().stream().map(this::toDto).toList();
    }

    public AccountDto getAccountById(Long id) {
        Account acc = accountRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Account not found: " + id));
        return toDto(acc);
    }

        // ===== UPDATE =====
        @Transactional
        public AccountDto update(Long id, UpdateAccountRequest req) {
            Account acc = accountRepository.findById(id)
                    .orElseThrow(() -> new NotFoundException("Account not found: " + id));


            if (StringUtils.hasText(req.getUsername()) && !req.getUsername().equals(acc.getUsername())) {
                if (accountRepository.existsByUsername(req.getUsername())) {
                    throw new IllegalArgumentException("username already exists");
                }
                acc.setUsername(req.getUsername());
            }

            if (req.getRole() != null) {
                acc.setRole(req.getRole());
            }

            if (req.getIsActive() != null) {
                acc.setIsActive(req.getIsActive());
            }

            acc.setUpdatedAt(LocalDateTime.now());
            return toDto(acc);
        }

    // ===== DELETE =====
    public void delete(Long id) {
        if (!accountRepository.existsById(id)) {
            throw new NotFoundException("Account not found: " + id);
        }
        accountRepository.deleteById(id);
    }

    // ===== PAGE (dùng PageRequestDto + PageResponse của bạn) =====
    public PageResponse<AccountDto> getAccountsPage(PageRequestDto req, Boolean isActive) {

        int page = (req.page == null || req.page < 1) ? 1 : req.page;   // 1-based
        int size = (req.size == null || req.size <= 0) ? 10 : req.size;

        String sortBy = (req.sortBy == null || req.sortBy.isBlank()) ? "accountId" : req.sortBy;
        String sortDir = (req.sortDir == null || req.sortDir.isBlank()) ? "desc" : req.sortDir;

        Sort sort = "desc".equalsIgnoreCase(sortDir)
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page - 1, size, sort); // Spring là 0-based

        Page<Account> pageData = (isActive == null)
                ? accountRepository.findAll(pageable)
                : accountRepository.findAllByIsActive(isActive, pageable);

        List<AccountDto> items = pageData.getContent().stream().map(this::toDto).toList();

        return new PageResponse<>(items, page, size, pageData.getTotalElements());
    }

    // ===== SEARCH (giống Employee /search) =====
    public PageResponse<AccountDto> searchAccountsByUsername(PageRequestDto req, String username) {
        int page = (req.page == null || req.page < 1) ? 1 : req.page;
        int size = (req.size == null || req.size <= 0) ? 10 : req.size;

        String sortBy = (req.sortBy == null || req.sortBy.isBlank()) ? "accountId" : req.sortBy;
        String sortDir = (req.sortDir == null || req.sortDir.isBlank()) ? "desc" : req.sortDir;

        Sort sort = "desc".equalsIgnoreCase(sortDir)
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page - 1, size, sort);

        Page<Account> pageData = accountRepository.findByUsernameContainingIgnoreCase(username, pageable);
        List<AccountDto> items = pageData.getContent().stream().map(this::toDto).toList();

        return new PageResponse<>(items, page, size, pageData.getTotalElements());
    }

    // ===== MAPPER =====
    private AccountDto toDto(Account a) {
        AccountDto dto = new AccountDto();
        dto.setAccountId(a.getAccountId());
        dto.setEmployeeId(a.getEmployeeId());
        dto.setUsername(a.getUsername());
        dto.setRole(a.getRole() != null ? a.getRole().name() : null); // DTO role là String
        dto.setIsActive(a.getIsActive());
        dto.setLastLoginAt(a.getLastLoginAt());
        dto.setCreatedAt(a.getCreatedAt());
        dto.setUpdatedAt(a.getUpdatedAt());
        return dto;
    }
}
