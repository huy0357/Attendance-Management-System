package org.example.ams_be.service;

import org.example.ams_be.dto.DepartmentDto;
import org.example.ams_be.entity.Department;
import org.example.ams_be.exception.ResourceNotFoundException;
import org.example.ams_be.repository.DepartmentRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class) 

// AMS-138
class DepartmentServiceTest {

    @Mock 
    private DepartmentRepository departmentRepository;

    @InjectMocks 
    private DepartmentService departmentService;

    // --- TEST CASE 1: Tạo mới thành công ---
    @Test
    void create_ShouldReturnDto_WhenDataIsValid() {

        DepartmentDto inputDto = new DepartmentDto();
        inputDto.departmentName = "Phòng IT";
        inputDto.departmentCode = "IT";

        Department savedEntity = new Department();
        savedEntity.setDepartmentId(1L);
        savedEntity.setDepartmentName("Phòng IT");
        savedEntity.setDepartmentCode("IT");

        when(departmentRepository.save(any(Department.class))).thenReturn(savedEntity);

        DepartmentDto result = departmentService.create(inputDto);

        Assertions.assertNotNull(result);
        Assertions.assertEquals(1L, result.departmentId);
        Assertions.assertEquals("Phòng IT", result.departmentName);

        verify(departmentRepository, times(1)).save(any(Department.class));
    }

    // --- TEST CASE 2: Lấy chi tiết thành công ---
    @Test
    void getById_ShouldReturnDto_WhenIdExists() {
        // Given
        Long id = 1L;
        Department entity = new Department();
        entity.setDepartmentId(id);
        entity.setDepartmentName("Phòng HR");

        // When
        when(departmentRepository.findById(id)).thenReturn(Optional.of(entity));

        // Act
        DepartmentDto result = departmentService.getById(id);

        // Then
        Assertions.assertEquals(id, result.departmentId);
        Assertions.assertEquals("Phòng HR", result.departmentName);
    }

    @Test
    void getById_ShouldThrowException_WhenIdNotFound() {
        // Given
        Long id = 99L;

        // When: Tìm ID 99 thì trả về rỗng
        when(departmentRepository.findById(id)).thenReturn(Optional.empty());

        // Act & Then: Mong đợi một Exception được ném ra
        ResourceNotFoundException exception = Assertions.assertThrows(
                ResourceNotFoundException.class,
                () -> departmentService.getById(id)
        );

        Assertions.assertEquals("Department not found with id: 99", exception.getMessage());
    }
}