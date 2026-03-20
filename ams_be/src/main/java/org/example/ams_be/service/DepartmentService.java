package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.DepartmentDto;
import org.example.ams_be.entity.Account;
import org.example.ams_be.entity.Department;
import org.example.ams_be.exception.ResourceNotFoundException;
import org.example.ams_be.repository.AccountRepository;
import org.example.ams_be.repository.DepartmentRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final AuditLogService auditLogService;
    private final AccountRepository accountRepository;

    private Long getCurrentActorId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                return accountRepository.findByUsername(auth.getName())
                        .map(Account::getEmployeeId)
                        .orElse(999L);
            }
        } catch (Exception e) {
            System.err.println("Loi lay ActorId: " + e.getMessage());
        }
        return 8L;
    }

    // 1. Lấy danh sách
    public Page<DepartmentDto> getAll(String keyword, Pageable pageable) {
        Page<Department> entities = (keyword == null || keyword.isBlank())
                ? departmentRepository.findAll(pageable)
                : departmentRepository.search(keyword, pageable);
        return entities.map(this::mapToDto);
    }

    // 2. Lấy chi tiết
    public DepartmentDto getById(Long id) {
        return departmentRepository.findById(id)
                .map(this::mapToDto)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + id));
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

        auditLogService.saveAuditLog("CREATE", "DEPARTMENT", saved.getDepartmentId(), 
                                    getCurrentActorId(), null, response);

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

        auditLogService.saveAuditLog("UPDATE", "DEPARTMENT", id, 
                                    getCurrentActorId(), oldData, newData);

        return newData;
    }

    // 5. Xóa
    @Transactional
    public void delete(Long id) {
        Department existing = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        DepartmentDto oldData = mapToDto(existing);

        departmentRepository.delete(existing);

        auditLogService.saveAuditLog("DELETE", "DEPARTMENT", id, 
                                    getCurrentActorId(), oldData, null);
    }

    // 6. Lấy danh sách phòng ban theo cấu trúc cây
    public List<DepartmentDto> getTree() {
        List<Department> allDepts = departmentRepository.findAll();
        List<DepartmentDto> allDtos = new ArrayList<>();
        Map<Long, DepartmentDto> map = new HashMap<>();

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

    private DepartmentDto mapToDto(Department entity) {
        DepartmentDto dto = new DepartmentDto();
        dto.departmentId = entity.getDepartmentId();
        dto.departmentName = entity.getDepartmentName();
        dto.departmentCode = entity.getDepartmentCode();
        dto.isActive = entity.getIsActive();
        
        if (entity.getParentDepartment() != null) {
            dto.parentDepartmentId = entity.getParentDepartment().getDepartmentId();
            dto.parentDepartmentName = entity.getParentDepartment().getDepartmentName();
        }

        dto.createdAt = entity.getCreatedAt();
        dto.updatedAt = entity.getUpdatedAt();
        return dto;
    }
}