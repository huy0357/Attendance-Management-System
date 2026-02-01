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

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    // 1. Lấy danh sách (Search + Phân trang tự động)
    public Page<DepartmentDto> getAll(String keyword, Pageable pageable) {
        Page<Department> entities;

        if (keyword == null || keyword.isBlank()) {
            entities = departmentRepository.findAll(pageable);
        } else {
            entities = departmentRepository.search(keyword, pageable);
        }

        // Convert Page<Entity> -> Page<DTO>
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
        
        // Map các trường cơ bản
        entity.setDepartmentName(request.departmentName);
        entity.setDepartmentCode(request.departmentCode);
        entity.setIsActive(request.isActive != null ? request.isActive : true);

        // Xử lý logic phòng ban cha (nếu có)
        if (request.parentDepartmentId != null) {
            Department parent = departmentRepository.findById(request.parentDepartmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Parent Department not found with id: " + request.parentDepartmentId));
            entity.setParentDepartment(parent);
        }

        Department saved = departmentRepository.save(entity);
        return mapToDto(saved);
    }

    // 4. Cập nhật
    @Transactional
    public DepartmentDto update(Long id, DepartmentDto request) {
        Department existing = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + id));

        // Cập nhật thông tin
        existing.setDepartmentName(request.departmentName);
        existing.setDepartmentCode(request.departmentCode);
        if (request.isActive != null) {
            existing.setIsActive(request.isActive);
        }

        // Cập nhật phòng ban cha (Xử lý thay đổi cha hoặc bỏ cha)
        if (request.parentDepartmentId != null) {
            // Trường hợp 1: Có gửi ID cha -> Tìm và gán
            // (Nên check thêm logic: cha không thể là chính nó)
            if (request.parentDepartmentId.equals(id)) {
                throw new IllegalArgumentException("Parent department cannot be itself");
            }
            Department parent = departmentRepository.findById(request.parentDepartmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Parent Department not found with id: " + request.parentDepartmentId));
            existing.setParentDepartment(parent);
        } else {
            // Trường hợp 2: Gửi null -> Set thành root (không có cha)
            existing.setParentDepartment(null);
        }

        Department updated = departmentRepository.save(existing);
        return mapToDto(updated);
    }

    // 5. Xóa
    @Transactional
    public void delete(Long id) {
        if (!departmentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Department not found with id: " + id);
        }
        // Lưu ý: Cần cân nhắc logic nếu xóa phòng cha thì các phòng con sẽ ra sao?
        // Thường sẽ chặn xóa nếu còn phòng con, hoặc set null cho phòng con.
        departmentRepository.deleteById(id);
    }

    // 6. Lấy danh sách phòng ban theo cấu trúc cây
    public List<DepartmentDto> getTree() {
        // B1: Lấy TOÀN BỘ danh sách phòng ban từ DB (phẳng)
        List<Department> allDepts = departmentRepository.findAll();

        // B2: Convert tất cả sang DTO và lưu vào một Map để tra cứu nhanh
        // Key: DepartmentId, Value: DepartmentDto
        List<DepartmentDto> allDtos = new ArrayList<>();
        java.util.Map<Long, DepartmentDto> map = new java.util.HashMap<>();

        for (Department entity : allDepts) {
            DepartmentDto dto = mapToDto(entity);
            allDtos.add(dto);
            map.put(dto.departmentId, dto);
        }

        // B3: Dựng cây (Gom con vào cha)
        List<DepartmentDto> roots = new ArrayList<>();

        for (DepartmentDto dto : allDtos) {
            if (dto.parentDepartmentId == null) {
                // Nếu không có cha -> Nó là Root (Gốc)
                roots.add(dto);
            } else {
                // Nếu có cha -> Tìm cha trong Map và add nó vào list children của cha
                DepartmentDto parent = map.get(dto.parentDepartmentId);
                if (parent != null) {
                    parent.children.add(dto);
                } else {
                    // Trường hợp dữ liệu lỗi (có ID cha nhưng cha không tồn tại)
                    // Ta có thể coi nó là root hoặc bỏ qua. Ở đây tạm coi là root.
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