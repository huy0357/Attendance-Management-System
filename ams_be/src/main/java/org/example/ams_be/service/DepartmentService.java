package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;

import java.util.ArrayList;
import java.util.List;

import org.example.ams_be.dto.DepartmentDto;
import org.example.ams_be.entity.Department;
import org.example.ams_be.exception.ResourceNotFoundException;
import org.example.ams_be.repository.DepartmentRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// AMS-136
@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final AuditLogService auditLogService;

    // 1. Lấy danh sách (Search + Phân trang tự động)
    public Page<DepartmentDto> getAll(String keyword, Pageable pageable) {
        Page<Department> entities;

        if (keyword == null || keyword.isBlank()) {
            entities = departmentRepository.findAll(pageable);
        } else {
            entities = departmentRepository.search(keyword, pageable);
        }

        return entities.map(this::mapToDto);
    }

    // 2. Lấy chi tiết
    public DepartmentDto getById(Long id) {
        Department entity = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + id));
        return mapToDto(entity);
    }

    // 3. Tạo mới
    @Transactional
    public DepartmentDto create(DepartmentDto request) {
        Department entity = new Department();
        entity.setDepartmentName(request.departmentName);
        entity.setDepartmentCode(request.departmentCode);
        entity.setIsActive(request.isActive != null ? request.isActive : true);

        if (request.parentDepartmentId != null) {
            Department parent = departmentRepository.findById(request.parentDepartmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Parent Department not found"));
            entity.setParentDepartment(parent);
        }

        Department saved = departmentRepository.save(entity);
        DepartmentDto response = mapToDto(saved);

        // 2. Ghi log CREATE
        // auditLogService.saveAuditLog("CREATE", "DEPARTMENT", saved.getDepartmentId(), actorId, null, response);

        return response;
    }

    // 4. Cập nhật
    @Transactional
    public DepartmentDto update(Long id, DepartmentDto request) {
        Department existing = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        // Lưu lại trạng thái cũ trước khi sửa để log
        DepartmentDto oldData = mapToDto(existing);

        existing.setDepartmentName(request.departmentName);
        existing.setDepartmentCode(request.departmentCode);
        if (request.isActive != null) {
            existing.setIsActive(request.isActive);
        }

        if (request.parentDepartmentId != null) {
            if (request.parentDepartmentId.equals(id)) {
                throw new IllegalArgumentException("Parent department cannot be itself");
            }
            Department parent = departmentRepository.findById(request.parentDepartmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Parent Department not found"));
            existing.setParentDepartment(parent);
        } else {
            existing.setParentDepartment(null);
        }

        Department updated = departmentRepository.save(existing);
        DepartmentDto newData = mapToDto(updated);

        // 3. Ghi log UPDATE
        // auditLogService.saveAuditLog("UPDATE", "DEPARTMENT", id, actorId, oldData, newData);

        return newData;
    }

    // 5. Xóa
    @Transactional
    public void delete(Long id) {
        Department existing = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        DepartmentDto oldData = mapToDto(existing);

        departmentRepository.delete(existing);

        // 4. Ghi log DELETE
        // auditLogService.saveAuditLog("DELETE", "DEPARTMENT", id, actorId, oldData, null);
    }

    // 6. Lấy danh sách phòng ban theo cấu trúc cây
    public List<DepartmentDto> getTree() {
        List<Department> allDepts = departmentRepository.findAll();
        List<DepartmentDto> allDtos = new ArrayList<>();
        java.util.Map<Long, DepartmentDto> map = new java.util.HashMap<>();

        for (Department entity : allDepts) {
            DepartmentDto dto = mapToDto(entity);
            allDtos.add(dto);
            map.put(dto.departmentId, dto);
        }

        List<DepartmentDto> roots = new ArrayList<>();

        for (DepartmentDto dto : allDtos) {
            if (dto.parentDepartmentId == null) {
                roots.add(dto);
            } else {
                DepartmentDto parent = map.get(dto.parentDepartmentId);
                if (parent != null) {
                    parent.children.add(dto);
                } else {
                    roots.add(dto);
                }
            }
        }

        return roots;
    }

    // --- Helper Mapping (Chuyển Entity sang DTO) ---
    private DepartmentDto mapToDto(Department entity) {
        DepartmentDto dto = new DepartmentDto();
        dto.departmentId = entity.getDepartmentId();
        dto.departmentName = entity.getDepartmentName();
        dto.departmentCode = entity.getDepartmentCode();
        dto.isActive = entity.getIsActive();
        
        // Map thông tin Parent nếu có
        if (entity.getParentDepartment() != null) {
            dto.parentDepartmentId = entity.getParentDepartment().getDepartmentId();
            dto.parentDepartmentName = entity.getParentDepartment().getDepartmentName();
        }

        dto.createdAt = entity.getCreatedAt();
        dto.updatedAt = entity.getUpdatedAt();
        return dto;
    }
}