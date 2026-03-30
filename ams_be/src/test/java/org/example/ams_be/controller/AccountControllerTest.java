package org.example.ams_be.controller;

import org.example.ams_be.dto.AccountDto;
import org.example.ams_be.dto.request.CreateAccountRequest;
import org.example.ams_be.dto.request.PageRequestDto;
import org.example.ams_be.dto.request.UpdateAccountRequest;
import org.example.ams_be.dto.response.AccountResponse;
import org.example.ams_be.dto.response.PageResponse;
import org.example.ams_be.service.AccountService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountControllerTest {

    @Mock
    private AccountService accountService;

    @InjectMocks
    private AccountController controller;

    @Test
    void getAllReturnsOk() {
        List<AccountDto> expected = List.of(accountDto(1L));
        when(accountService.getAllAccounts()).thenReturn(expected);

        ResponseEntity<List<AccountDto>> response = controller.getAll();

        assertEquals(200, response.getStatusCode().value());
        assertEquals(expected, response.getBody());
    }

    @Test
    void getByIdReturnsOk() {
        AccountDto expected = accountDto(2L);
        when(accountService.getAccountById(2L)).thenReturn(expected);

        ResponseEntity<AccountDto> response = controller.getById(2L);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(expected, response.getBody());
    }

    @Test
    void createReturnsCreated() {
        CreateAccountRequest request = CreateAccountRequest.builder().employeeId(1L).username("alice").build();
        AccountResponse created = AccountResponse.builder().accountId(3L).roleCode("ADMIN").build();
        when(accountService.createAccount(request)).thenReturn(created);

        ResponseEntity<AccountResponse> response = controller.create(request);

        assertEquals(201, response.getStatusCode().value());
        assertEquals(created, response.getBody());
    }

    @Test
    void updateReturnsOk() {
        UpdateAccountRequest request = new UpdateAccountRequest();
        AccountDto updated = accountDto(4L);
        when(accountService.update(4L, request)).thenReturn(updated);

        ResponseEntity<AccountDto> response = controller.update(4L, request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(updated, response.getBody());
    }

    @Test
    void deleteReturnsNoContent() {
        ResponseEntity<Void> response = controller.delete(5L);

        assertEquals(204, response.getStatusCode().value());
        verify(accountService).delete(5L);
    }

    @Test
    void getPageReturnsOk() {
        PageRequestDto request = new PageRequestDto();
        PageResponse<AccountDto> expected = new PageResponse<>(List.of(accountDto(6L)), 1, 10, 1);
        when(accountService.getAccountsPage(request, true)).thenReturn(expected);

        ResponseEntity<PageResponse<AccountDto>> response = controller.getPage(request, true);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(expected, response.getBody());
    }

    @Test
    void searchByUsernameReturnsOk() {
        PageRequestDto request = new PageRequestDto();
        PageResponse<AccountDto> expected = new PageResponse<>(List.of(accountDto(7L)), 1, 10, 1);
        when(accountService.searchAccountsByUsername(request, "ali")).thenReturn(expected);

        ResponseEntity<PageResponse<AccountDto>> response = controller.searchByUsername("ali", request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(expected, response.getBody());
    }

    private AccountDto accountDto(Long id) {
        AccountDto dto = new AccountDto();
        dto.setAccountId(id);
        dto.setUsername("user-" + id);
        return dto;
    }
}
