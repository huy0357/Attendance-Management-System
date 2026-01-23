package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.AccountResponse;
import org.example.ams_be.dto.CreateAccountRequest;
import org.example.ams_be.service.AccountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @PostMapping
    public ResponseEntity<AccountResponse> create(@RequestBody CreateAccountRequest req) {
        AccountResponse res = accountService.createAccount(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }
}
