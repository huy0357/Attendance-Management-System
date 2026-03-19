package org.example.ams_be.controller;

import org.example.ams_be.dto.EmployeeDto;
import org.example.ams_be.dto.request.EmployeeRequest;
import org.example.ams_be.dto.response.PageResponse;
import org.example.ams_be.service.EmployeeService;
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
class EmployeeControllerTest {

    @Mock
    private EmployeeService employeeService;

    @InjectMocks
    private EmployeeController controller;

    @Test
    void getAllReturnsOk() {
        List<EmployeeDto> expected = List.of(employeeDto(1L));
        when(employeeService.getAllEmployees()).thenReturn(expected);

        ResponseEntity<List<EmployeeDto>> response = controller.getAll();

        assertEquals(200, response.getStatusCode().value());
        assertEquals(expected, response.getBody());
    }

    @Test
    void getByIdReturnsOk() {
        EmployeeDto expected = employeeDto(2L);
        when(employeeService.getEmployeeById(2L)).thenReturn(expected);

        ResponseEntity<EmployeeDto> response = controller.getById(2L);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(expected, response.getBody());
    }

    @Test
    void createReturnsOk() {
        EmployeeRequest request = new EmployeeRequest();
        EmployeeDto created = employeeDto(3L);
        when(employeeService.create(request)).thenReturn(created);

        ResponseEntity<EmployeeDto> response = controller.create(request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(created, response.getBody());
    }

    @Test
    void updateReturnsOk() {
        EmployeeRequest request = new EmployeeRequest();
        EmployeeDto updated = employeeDto(4L);
        when(employeeService.update(4L, request)).thenReturn(updated);

        ResponseEntity<EmployeeDto> response = controller.update(4L, request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(updated, response.getBody());
    }

    @Test
    void deleteReturnsNoContent() {
        ResponseEntity<Void> response = controller.delete(5L);

        assertEquals(204, response.getStatusCode().value());
        verify(employeeService).delete(5L);
    }

    @Test
    void getPageReturnsOk() {
        PageResponse<EmployeeDto> expected = new PageResponse<>(List.of(employeeDto(6L)), 1, 10, 1);
        when(employeeService.getEmployeesPage(1, 10, "fullName", "asc")).thenReturn(expected);

        ResponseEntity<PageResponse<EmployeeDto>> response = controller.getPage(1, 10, "fullName", "asc");

        assertEquals(200, response.getStatusCode().value());
        assertEquals(expected, response.getBody());
    }

    @Test
    void searchByNameReturnsOk() {
        PageResponse<EmployeeDto> expected = new PageResponse<>(List.of(employeeDto(7L)), 1, 10, 1);
        when(employeeService.searchEmployeesByName(1, 10, "Alice", "employeeId", "desc")).thenReturn(expected);

        ResponseEntity<PageResponse<EmployeeDto>> response = controller.searchByName("Alice", 1, 10, "employeeId", "desc");

        assertEquals(200, response.getStatusCode().value());
        assertEquals(expected, response.getBody());
    }

    private EmployeeDto employeeDto(Long id) {
        EmployeeDto dto = new EmployeeDto();
        dto.employeeId = id;
        dto.fullName = "Employee " + id;
        return dto;
    }
}
