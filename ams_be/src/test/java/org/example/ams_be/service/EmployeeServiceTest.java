package org.example.ams_be.service;

import org.example.ams_be.dto.EmployeeDto;
import org.example.ams_be.dto.request.EmployeeRequest;
import org.example.ams_be.dto.response.PageResponse;
import org.example.ams_be.exception.BadRequestException;
import org.example.ams_be.exception.NotFoundException;
import org.example.ams_be.repository.AccountRepository;
import org.example.ams_be.repository.EmployeeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private AccountRepository accountRepository;

    @InjectMocks
    private EmployeeService employeeService;

    @Test
    void create_duplicateEmployeeCode_throwException() {
        EmployeeRequest req = new EmployeeRequest();
        req.employeeCode = "EMP001";
        req.email = "test@company.com";

        when(employeeRepository.existsByEmployeeCode("EMP001"))
                .thenReturn(true);

        assertThrows(BadRequestException.class, () -> employeeService.create(req));
    }

    @Test
    void create_duplicateEmail_throwException() {
        EmployeeRequest req = new EmployeeRequest();
        req.employeeCode = "EMP002";
        req.email = "test@company.com";

        when(employeeRepository.existsByEmployeeCode("EMP002"))
                .thenReturn(false);
        when(employeeRepository.existsByEmail("test@company.com"))
                .thenReturn(true);

        assertThrows(BadRequestException.class, () -> employeeService.create(req));
    }

    @Test
    void create_success_returnCreatedEmployee() {
        EmployeeRequest req = new EmployeeRequest();
        req.employeeCode = "EMP003";
        req.email = "new@company.com";

        EmployeeDto saved = new EmployeeDto();
        saved.employeeId = 5L;
        saved.employeeCode = "EMP003";
        saved.email = "new@company.com";
        saved.status = "ACTIVE";

        when(employeeRepository.existsByEmployeeCode("EMP003")).thenReturn(false);
        when(employeeRepository.existsByEmail("new@company.com")).thenReturn(false);
        when(employeeRepository.insert(eq(req), eq("ACTIVE"), any())).thenReturn(5L);
        when(employeeRepository.findById(5L)).thenReturn(Optional.of(saved));

        EmployeeDto result = employeeService.create(req);

        assertEquals(5L, result.employeeId);
        assertEquals("EMP003", result.employeeCode);
        assertEquals("ACTIVE", result.status);
    }

    @Test
    void create_throwWhenInsertedEmployeeCannotBeReadBack() {
        EmployeeRequest req = new EmployeeRequest();
        req.employeeCode = "EMP004";
        req.email = "x@company.com";

        when(employeeRepository.existsByEmployeeCode("EMP004")).thenReturn(false);
        when(employeeRepository.existsByEmail("x@company.com")).thenReturn(false);
        when(employeeRepository.insert(eq(req), eq("ACTIVE"), any())).thenReturn(9L);
        when(employeeRepository.findById(9L)).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> employeeService.create(req));
    }

    @Test
    void getEmployeeById_throwWhenNotFound() {
        when(employeeRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> employeeService.getEmployeeById(99L));
    }

    @Test
    void getEmployeeById_returnEmployeeWhenFound() {
        EmployeeDto employee = new EmployeeDto();
        employee.employeeId = 1L;
        employee.fullName = "Alice";
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));

        EmployeeDto result = employeeService.getEmployeeById(1L);

        assertEquals(1L, result.employeeId);
        assertEquals("Alice", result.fullName);
    }

    @Test
    void getAllEmployees_returnRepositoryResult() {
        EmployeeDto employee = new EmployeeDto();
        employee.employeeId = 1L;
        when(employeeRepository.findAll()).thenReturn(List.of(employee));

        List<EmployeeDto> result = employeeService.getAllEmployees();

        assertEquals(1, result.size());
        assertEquals(1L, result.get(0).employeeId);
    }

    @Test
    void update_changeEmailToExistingEmail_throwException() {
        Long employeeId = 1L;

        EmployeeDto current = new EmployeeDto();
        current.employeeId = employeeId;
        current.email = "old@company.com";

        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(current));
        when(employeeRepository.existsByEmail("new@company.com")).thenReturn(true);

        EmployeeRequest req = new EmployeeRequest();
        req.email = "new@company.com";

        assertThrows(BadRequestException.class, () -> employeeService.update(employeeId, req));
    }

    @Test
    void update_changeEmailToUniqueEmail_shouldPass() {
        Long employeeId = 1L;

        EmployeeDto current = new EmployeeDto();
        current.employeeId = employeeId;
        current.email = "old@company.com";

        EmployeeDto updated = new EmployeeDto();
        updated.employeeId = employeeId;
        updated.email = "new@company.com";

        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(current), Optional.of(updated));
        when(employeeRepository.existsByEmail("new@company.com")).thenReturn(false);
        when(employeeRepository.update(eq(employeeId), any(), any())).thenReturn(1);

        EmployeeRequest req = new EmployeeRequest();
        req.email = "new@company.com";

        EmployeeDto result = employeeService.update(employeeId, req);

        assertEquals("new@company.com", result.email);
    }

    @Test
    void update_keepSameEmail_shouldPass() {
        Long employeeId = 1L;

        EmployeeDto current = new EmployeeDto();
        current.employeeId = employeeId;
        current.email = "same@company.com";

        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(current));
        when(employeeRepository.update(eq(employeeId), any(), any())).thenReturn(1);
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(current));

        EmployeeRequest req = new EmployeeRequest();
        req.email = "same@company.com";

        EmployeeDto result = employeeService.update(employeeId, req);

        assertEquals(employeeId, result.employeeId);
    }

    @Test
    void update_withNullEmail_shouldSkipDuplicateCheckAndPass() {
        Long employeeId = 1L;

        EmployeeDto current = new EmployeeDto();
        current.employeeId = employeeId;
        current.email = "same@company.com";

        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(current), Optional.of(current));
        when(employeeRepository.update(eq(employeeId), any(), any())).thenReturn(1);

        EmployeeDto result = employeeService.update(employeeId, new EmployeeRequest());

        assertEquals(employeeId, result.employeeId);
    }

    @Test
    void update_throwWhenEmployeeNotFound() {
        when(employeeRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> employeeService.update(1L, new EmployeeRequest()));
    }

    @Test
    void update_throwWhenRepositoryReturnsZero() {
        Long employeeId = 1L;
        EmployeeDto current = new EmployeeDto();
        current.employeeId = employeeId;
        current.email = "same@company.com";

        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(current));
        when(employeeRepository.update(eq(employeeId), any(), any())).thenReturn(0);

        EmployeeRequest req = new EmployeeRequest();
        req.email = "same@company.com";

        assertThrows(BadRequestException.class, () -> employeeService.update(employeeId, req));
    }

    @Test
    void delete_throwWhenEmployeeNotFound() {
        when(employeeRepository.findById(7L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> employeeService.delete(7L));
    }

    @Test
    void delete_callRepositoryWhenEmployeeExists() {
        EmployeeDto employee = new EmployeeDto();
        employee.employeeId = 7L;
        when(employeeRepository.findById(7L)).thenReturn(Optional.of(employee));

        employeeService.delete(7L);

        verify(employeeRepository).deleteById(7L);
    }

    @Test
    void getEmployeesPage_usePaginationDefaults() {
        EmployeeDto employee = new EmployeeDto();
        employee.employeeId = 1L;
        when(employeeRepository.countAll()).thenReturn(12L);
        when(employeeRepository.findPage(0, 10, "employee_id", "desc")).thenReturn(List.of(employee));

        PageResponse<EmployeeDto> result = employeeService.getEmployeesPage(null, null, null, null);

        assertEquals(1, result.page);
        assertEquals(10, result.size);
        assertEquals(12L, result.totalItems);
        assertEquals(1, result.items.size());
    }

    @Test
    void searchEmployeesByName_blankKeywordFallsBackToNormalPage() {
        EmployeeDto employee = new EmployeeDto();
        employee.employeeId = 2L;
        when(employeeRepository.countAll()).thenReturn(5L);
        when(employeeRepository.findPage(10, 10, "employee_id", "desc")).thenReturn(List.of(employee));

        PageResponse<EmployeeDto> result = employeeService.searchEmployeesByName(2, null, "   ", null, null);

        assertEquals(2, result.page);
        assertEquals(10, result.size);
        assertEquals(5L, result.totalItems);
        assertEquals(2L, result.items.get(0).employeeId);
    }

    @Test
    void searchEmployeesByName_nullKeywordFallsBackToNormalPage() {
        EmployeeDto employee = new EmployeeDto();
        employee.employeeId = 4L;
        when(employeeRepository.countAll()).thenReturn(1L);
        when(employeeRepository.findPage(0, 10, "employee_id", "desc")).thenReturn(List.of(employee));

        PageResponse<EmployeeDto> result = employeeService.searchEmployeesByName(null, null, null, null, null);

        assertEquals(1, result.page);
        assertEquals(10, result.size);
        assertEquals(4L, result.items.get(0).employeeId);
    }

    @Test
    void searchEmployeesByName_useFilteredSearchWhenKeywordPresent() {
        EmployeeDto employee = new EmployeeDto();
        employee.employeeId = 3L;
        employee.fullName = "Alice";
        when(employeeRepository.countByName("Alice")).thenReturn(1L);
        when(employeeRepository.findPageByName(0, 5, "Alice", "full_name", "asc")).thenReturn(List.of(employee));

        PageResponse<EmployeeDto> result = employeeService.searchEmployeesByName(1, 5, " Alice ", "full_name", "asc");

        assertEquals(1, result.totalItems);
        assertEquals("Alice", result.items.get(0).fullName);
        assertNotNull(result.items);
    }
}
