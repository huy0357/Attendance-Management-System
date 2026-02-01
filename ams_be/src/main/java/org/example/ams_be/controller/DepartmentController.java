package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;

import java.util.List;

import org.example.ams_be.dto.DepartmentDto;
import org.example.ams_be.service.DepartmentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController // Đánh dấu đây là API Controller trả về JSON
@RequestMapping("/api/departments") // Đường dẫn gốc cho tất cả API trong file này
@RequiredArgsConstructor // Tự động inject DepartmentService
public class DepartmentController {

    private final DepartmentService departmentService;

    /**
     * 1. Lấy danh sách phòng ban (Có phân trang + Tìm kiếm)
     * URL mẫu: GET /api/departments?page=0&size=10&keyword=IT
     */
    @GetMapping
    public ResponseEntity<Page<DepartmentDto>> getAll(
            @RequestParam(required = false) String keyword, // Tham số keyword trên URL (có thể không gửi)
            // @PageableDefault: Cấu hình mặc định nếu client không gửi tham số phân trang
            @PageableDefault(page = 0, size = 10, sort = "departmentId", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        // Gọi Service -> Service gọi Repo -> Repo trả Entity -> Service map sang DTO -> Trả về Controller
        Page<DepartmentDto> result = departmentService.getAll(keyword, pageable);
        return ResponseEntity.ok(result);
    }

    /**
     * 2. Lấy chi tiết một phòng ban
     * URL mẫu: GET /api/departments/1
     */
    @GetMapping("/{id}")
    public ResponseEntity<DepartmentDto> getById(@PathVariable Long id) {
        DepartmentDto result = departmentService.getById(id);
        return ResponseEntity.ok(result);
    }

    /**
     * 3. Tạo mới phòng ban
     * URL mẫu: POST /api/departments
     * Body: { "departmentName": "Sale", "departmentCode": "SA", ... }
     */
    @PostMapping
    public ResponseEntity<DepartmentDto> create(@RequestBody DepartmentDto request) {
        DepartmentDto result = departmentService.create(request);
        // Trả về mã 201 Created thay vì 200 OK
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    /**
     * 4. Cập nhật phòng ban
     * URL mẫu: PUT /api/departments/1
     * Body: { "departmentName": "Sale Update", ... }
     */
    @PutMapping("/{id}")
    public ResponseEntity<DepartmentDto> update(@PathVariable Long id, @RequestBody DepartmentDto request) {
        DepartmentDto result = departmentService.update(id, request);
        return ResponseEntity.ok(result);
    }

    /**
     * 5. Xóa phòng ban
     * URL mẫu: DELETE /api/departments/1
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        departmentService.delete(id);
        // Trả về 204 No Content (Thành công nhưng không có nội dung trả về)
        return ResponseEntity.noContent().build();
    }

    /**
     * 6. Lấy danh sách phòng ban theo cấu trúc cây
     * URL mẫu: GET /api/departments/tree
     */
    @GetMapping("/tree")
    public ResponseEntity<List<DepartmentDto>> getTree() {
        return ResponseEntity.ok(departmentService.getTree());
    }
}