package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.AccountResponse;
import org.example.ams_be.dto.CreateAccountRequest;
import org.example.ams_be.entity.Account;
import org.example.ams_be.repository.AccountRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    public AccountResponse createAccount(CreateAccountRequest req) {
        // Validate cơ bản
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

        // Unique checks
        if (accountRepository.existsByUsername(req.getUsername())) {
            throw new IllegalArgumentException("username already exists");
        }
        if (accountRepository.existsByEmployeeId(req.getEmployeeId())) {
            throw new IllegalArgumentException("employee already has an account");
        }

        // Hash password
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
}
