package org.example.ams_be.controller;

import org.example.ams_be.dto.DepartmentDto;
import org.example.ams_be.service.DepartmentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DepartmentControllerTest {

    @Mock
    private DepartmentService departmentService;

    @InjectMocks
    private DepartmentController controller;

    @Test
    void getAllReturnsOkPage() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<DepartmentDto> expected = new PageImpl<>(List.of(departmentDto(1L)), pageable, 1);
        when(departmentService.getAll("IT", pageable)).thenReturn(expected);

        ResponseEntity<Page<DepartmentDto>> response = controller.getAll("IT", pageable);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(expected, response.getBody());
    }

    @Test
    void getByIdReturnsOk() {
        DepartmentDto expected = departmentDto(2L);
        when(departmentService.getById(2L)).thenReturn(expected);

        ResponseEntity<DepartmentDto> response = controller.getById(2L);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(expected, response.getBody());
    }

    @Test
    void createReturnsCreated() {
        DepartmentDto request = departmentDto(null);
        DepartmentDto created = departmentDto(3L);
        when(departmentService.create(request)).thenReturn(created);

        ResponseEntity<DepartmentDto> response = controller.create(request);

        assertEquals(201, response.getStatusCode().value());
        assertEquals(created, response.getBody());
    }

    @Test
    void updateReturnsOk() {
        DepartmentDto request = departmentDto(null);
        DepartmentDto updated = departmentDto(4L);
        when(departmentService.update(4L, request)).thenReturn(updated);

        ResponseEntity<DepartmentDto> response = controller.update(4L, request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(updated, response.getBody());
    }

    @Test
    void deleteReturnsNoContent() {
        ResponseEntity<Void> response = controller.delete(5L);

        assertEquals(204, response.getStatusCode().value());
        verify(departmentService).delete(5L);
    }

    @Test
    void getTreeReturnsOk() {
        List<DepartmentDto> expected = List.of(departmentDto(6L));
        when(departmentService.getTree()).thenReturn(expected);

        ResponseEntity<List<DepartmentDto>> response = controller.getTree();

        assertEquals(200, response.getStatusCode().value());
        assertEquals(expected, response.getBody());
    }

    private DepartmentDto departmentDto(Long id) {
        DepartmentDto dto = new DepartmentDto();
        dto.departmentId = id;
        dto.departmentName = "Department " + id;
        return dto;
    }
}
