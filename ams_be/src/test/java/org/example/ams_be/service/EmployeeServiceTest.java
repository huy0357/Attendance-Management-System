package org.example.ams_be.service;

import org.example.ams_be.dto.EmployeeDto;
import org.example.ams_be.dto.request.EmployeeRequest;

import org.example.ams_be.exception.BadRequestException;
import org.example.ams_be.repository.EmployeeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private EmployeeService employeeService;

    // ===== CREATE =====

    @Test
    void create_duplicateEmployeeCode_throwException() {
        EmployeeRequest req = new EmployeeRequest();
        req.employeeCode = "EMP001";
        req.email = "test@company.com";

        when(employeeRepository.existsByEmployeeCode("EMP001"))
                .thenReturn(true);

        assertThrows(
                BadRequestException.class,
                () -> employeeService.create(req)
        );
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

        assertThrows(
                BadRequestException.class,
                () -> employeeService.create(req)
        );
    }

    // ===== UPDATE (PARTIAL UPDATE) =====

    @Test
    void update_changeEmailToExistingEmail_throwException() {
        Long employeeId = 1L;

        EmployeeDto current = new EmployeeDto();
        current.employeeId = employeeId;
        current.email = "old@company.com";

        when(employeeRepository.findById(employeeId))
                .thenReturn(Optional.of(current));

        when(employeeRepository.existsByEmail("new@company.com"))
                .thenReturn(true);

        EmployeeRequest req = new EmployeeRequest();
        req.email = "new@company.com";

        assertThrows(
                BadRequestException.class,
                () -> employeeService.update(employeeId, req)
        );
    }

    @Test
    void update_keepSameEmail_shouldPass() {
        Long employeeId = 1L;

        EmployeeDto current = new EmployeeDto();
        current.employeeId = employeeId;
        current.email = "same@company.com";

        when(employeeRepository.findById(employeeId))
                .thenReturn(Optional.of(current));

        when(employeeRepository.update(eq(employeeId), any(), any()))
                .thenReturn(1);

        when(employeeRepository.findById(employeeId))
                .thenReturn(Optional.of(current));

        EmployeeRequest req = new EmployeeRequest();
        req.email = "same@company.com";

        // Không throw exception
        employeeService.update(employeeId, req);
    }
}
