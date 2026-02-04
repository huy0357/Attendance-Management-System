package org.example.ams_be.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.AccountDto;
import org.example.ams_be.dto.request.CreateAccountRequest;
import org.example.ams_be.dto.request.PageRequestDto;
import org.example.ams_be.dto.request.UpdateAccountRequest;
import org.example.ams_be.dto.response.AccountResponse;
import org.example.ams_be.dto.response.PageResponse;
import org.example.ams_be.service.AccountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping
    public ResponseEntity<List<AccountDto>> getAll() {
        return ResponseEntity.ok(accountService.getAllAccounts());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccountDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(accountService.getAccountById(id));
    }

    @PostMapping
    public ResponseEntity<AccountResponse> create(@Valid @RequestBody CreateAccountRequest req) {
        AccountResponse res = accountService.createAccount(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AccountDto> update(
            @PathVariable Long id,
            @RequestBody UpdateAccountRequest req
    ) {
        return ResponseEntity.ok(accountService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        accountService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ====== PAGE  ======
    // GET /api/accounts/page?page=1&size=10&sortBy=accountId&sortDir=desc&isActive=true
    @GetMapping("/page")
    public ResponseEntity<PageResponse<AccountDto>> getPage(
            @ModelAttribute PageRequestDto pageRequest,
            @RequestParam(required = false) Boolean isActive
    ) {
        return ResponseEntity.ok(accountService.getAccountsPage(pageRequest, isActive));
    }

    // ====== SEARCH giống EmployeeController ======
    // GET /api/accounts/search?username=adm&page=1&size=10&sortBy=accountId&sortDir=desc
    @GetMapping("/search")
    public ResponseEntity<PageResponse<AccountDto>> searchByUsername(
            @RequestParam String username,
            @ModelAttribute PageRequestDto pageRequest
    ) {
        return ResponseEntity.ok(accountService.searchAccountsByUsername(pageRequest, username));
    }
}
