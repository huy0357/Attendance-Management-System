package org.example.ams_be.service;

import org.example.ams_be.dto.DepartmentDto;
import org.example.ams_be.entity.Department;
import org.example.ams_be.exception.ResourceNotFoundException;
import org.example.ams_be.repository.AccountRepository;
import org.example.ams_be.repository.DepartmentRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DepartmentServiceTest {

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private AccountRepository accountRepository;

    @InjectMocks
    private DepartmentService departmentService;

    @Test
    void create_ShouldReturnDto_WhenDataIsValid() {
        DepartmentDto inputDto = new DepartmentDto();
        inputDto.departmentName = "Phong IT";
        inputDto.departmentCode = "IT";

        Department savedEntity = department(1L, "IT", "Phong IT", null, true);
        when(departmentRepository.save(any(Department.class))).thenReturn(savedEntity);

        DepartmentDto result = departmentService.create(inputDto);

        Assertions.assertNotNull(result);
        Assertions.assertEquals(1L, result.departmentId);
        Assertions.assertEquals("Phong IT", result.departmentName);
        verify(departmentRepository, times(1)).save(any(Department.class));
        verify(auditLogService).saveAuditLog(any(), any(), any(), any(), any(), any());
    }

    @Test
    void create_ShouldSetParent_WhenParentDepartmentExists() {
        DepartmentDto inputDto = new DepartmentDto();
        inputDto.departmentName = "Backend";
        inputDto.departmentCode = "BE";
        inputDto.parentDepartmentId = 10L;

        Department parent = department(10L, "IT", "IT", null, true);
        Department saved = department(11L, "BE", "Backend", parent, true);
        when(departmentRepository.findById(10L)).thenReturn(Optional.of(parent));
        when(departmentRepository.save(any(Department.class))).thenReturn(saved);

        DepartmentDto result = departmentService.create(inputDto);

        Assertions.assertEquals(10L, result.parentDepartmentId);
        Assertions.assertEquals("IT", result.parentDepartmentName);
    }

    @Test
    void create_ShouldThrow_WhenParentDepartmentNotFound() {
        DepartmentDto inputDto = new DepartmentDto();
        inputDto.departmentName = "Backend";
        inputDto.departmentCode = "BE";
        inputDto.parentDepartmentId = 10L;
        when(departmentRepository.findById(10L)).thenReturn(Optional.empty());

        Assertions.assertThrows(ResourceNotFoundException.class, () -> departmentService.create(inputDto));
    }

    @Test
    void getById_ShouldReturnDto_WhenIdExists() {
        Long id = 1L;
        Department entity = department(id, "HR", "Phong HR", null, true);
        when(departmentRepository.findById(id)).thenReturn(Optional.of(entity));

        DepartmentDto result = departmentService.getById(id);

        Assertions.assertEquals(id, result.departmentId);
        Assertions.assertEquals("Phong HR", result.departmentName);
    }

    @Test
    void getById_ShouldThrowException_WhenIdNotFound() {
        Long id = 99L;
        when(departmentRepository.findById(id)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = Assertions.assertThrows(
                ResourceNotFoundException.class,
                () -> departmentService.getById(id)
        );

        Assertions.assertEquals("Department not found with id: 99", exception.getMessage());
    }

    @Test
    void getAll_ShouldUseFindAll_WhenKeywordBlank() {
        PageRequest pageable = PageRequest.of(0, 10);
        when(departmentRepository.findAll(pageable))
                .thenReturn(new PageImpl<>(List.of(department(1L, "IT", "IT", null, true)), pageable, 1));

        Page<DepartmentDto> result = departmentService.getAll("   ", pageable);

        Assertions.assertEquals(1, result.getTotalElements());
        Assertions.assertEquals("IT", result.getContent().get(0).departmentCode);
    }

    @Test
    void getAll_ShouldUseFindAll_WhenKeywordNull() {
        PageRequest pageable = PageRequest.of(0, 10);
        when(departmentRepository.findAll(pageable))
                .thenReturn(new PageImpl<>(List.of(department(1L, "IT", "IT", null, true)), pageable, 1));

        Page<DepartmentDto> result = departmentService.getAll(null, pageable);

        Assertions.assertEquals(1, result.getTotalElements());
        Assertions.assertEquals("IT", result.getContent().get(0).departmentCode);
    }

    @Test
    void getAll_ShouldUseSearch_WhenKeywordProvided() {
        PageRequest pageable = PageRequest.of(0, 10);
        when(departmentRepository.search("it", pageable))
                .thenReturn(new PageImpl<>(List.of(department(1L, "IT", "IT", null, true)), pageable, 1));

        Page<DepartmentDto> result = departmentService.getAll("it", pageable);

        Assertions.assertEquals(1, result.getTotalElements());
        Assertions.assertEquals("IT", result.getContent().get(0).departmentName);
    }

    @Test
    void update_ShouldThrow_WhenParentIsItself() {
        Department existing = department(1L, "IT", "IT", null, true);
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(existing));

        DepartmentDto request = new DepartmentDto();
        request.departmentName = "IT";
        request.departmentCode = "IT";
        request.parentDepartmentId = 1L;

        Assertions.assertThrows(IllegalArgumentException.class, () -> departmentService.update(1L, request));
    }

    @Test
    void update_ShouldThrow_WhenParentNotFound() {
        Department existing = department(1L, "IT", "IT", null, true);
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(departmentRepository.findById(2L)).thenReturn(Optional.empty());

        DepartmentDto request = new DepartmentDto();
        request.departmentName = "IT New";
        request.departmentCode = "ITN";
        request.parentDepartmentId = 2L;

        Assertions.assertThrows(ResourceNotFoundException.class, () -> departmentService.update(1L, request));
    }

    @Test
    void create_ShouldKeepExplicitInactiveFlag_WhenProvided() {
        DepartmentDto inputDto = new DepartmentDto();
        inputDto.departmentName = "Archived";
        inputDto.departmentCode = "ARC";
        inputDto.isActive = false;

        Department savedEntity = department(12L, "ARC", "Archived", null, false);
        when(departmentRepository.save(any(Department.class))).thenReturn(savedEntity);

        DepartmentDto result = departmentService.create(inputDto);

        Assertions.assertFalse(result.isActive);
    }

    @Test
    void update_ShouldSaveAndReturnDto_WhenValid() {
        Department existing = department(1L, "IT", "IT", null, true);
        Department parent = department(2L, "HQ", "Headquarter", null, true);
        Department updated = department(1L, "ITN", "IT New", parent, false);
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(departmentRepository.findById(2L)).thenReturn(Optional.of(parent));
        when(departmentRepository.save(existing)).thenReturn(updated);

        DepartmentDto request = new DepartmentDto();
        request.departmentName = "IT New";
        request.departmentCode = "ITN";
        request.parentDepartmentId = 2L;
        request.isActive = false;

        DepartmentDto result = departmentService.update(1L, request);

        Assertions.assertEquals("IT New", result.departmentName);
        Assertions.assertEquals("ITN", result.departmentCode);
        Assertions.assertEquals(2L, result.parentDepartmentId);
        Assertions.assertFalse(result.isActive);
    }

    @Test
    void update_ShouldClearParent_WhenRequestParentIsNull() {
        Department parent = department(2L, "HQ", "Headquarter", null, true);
        Department existing = department(1L, "IT", "IT", parent, true);
        Department updated = department(1L, "IT", "IT", null, true);
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(departmentRepository.save(existing)).thenReturn(updated);

        DepartmentDto request = new DepartmentDto();
        request.departmentName = "IT";
        request.departmentCode = "IT";
        request.parentDepartmentId = null;
        request.isActive = true;

        DepartmentDto result = departmentService.update(1L, request);

        Assertions.assertNull(result.parentDepartmentId);
        Assertions.assertNull(result.parentDepartmentName);
    }

    @Test
    void delete_ShouldThrow_WhenDepartmentNotFound() {
        when(departmentRepository.findById(9L)).thenReturn(Optional.empty());

        Assertions.assertThrows(ResourceNotFoundException.class, () -> departmentService.delete(9L));
    }

    @Test
    void delete_ShouldCallRepositoryDelete_WhenDepartmentExists() {
        Department existing = department(1L, "IT", "IT", null, true);
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(existing));

        departmentService.delete(1L);

        verify(departmentRepository).delete(existing);
    }

    @Test
    void getTree_ShouldBuildParentChildStructure() {
        Department root = department(1L, "HQ", "Headquarter", null, true);
        Department child = department(2L, "IT", "IT", root, true);
        Department orphan = department(3L, "OPS", "Operations", department(99L, "X", "Missing", null, true), true);
        when(departmentRepository.findAll()).thenReturn(List.of(root, child, orphan));

        List<DepartmentDto> tree = departmentService.getTree();

        Assertions.assertEquals(2, tree.size());
        DepartmentDto rootDto = tree.stream().filter(d -> d.departmentId.equals(1L)).findFirst().orElseThrow();
        Assertions.assertEquals(1, rootDto.children.size());
        Assertions.assertEquals(2L, rootDto.children.get(0).departmentId);
        Assertions.assertTrue(tree.stream().anyMatch(d -> d.departmentId.equals(3L)));
    }

    private Department department(Long id, String code, String name, Department parent, boolean active) {
        Department department = new Department();
        department.setDepartmentId(id);
        department.setDepartmentCode(code);
        department.setDepartmentName(name);
        department.setParentDepartment(parent);
        department.setIsActive(active);
        department.setCreatedAt(LocalDateTime.of(2026, 3, 1, 8, 0));
        department.setUpdatedAt(LocalDateTime.of(2026, 3, 2, 8, 0));
        return department;
    }
}
