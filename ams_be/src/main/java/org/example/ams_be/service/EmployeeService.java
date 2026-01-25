package org.example.ams_be.service;

import org.example.ams_be.dto.EmployeeDto;
import org.example.ams_be.dto.request.EmployeeRequest;
import org.example.ams_be.dto.response.PageResponse;
import org.example.ams_be.exception.BadRequestException;
import org.example.ams_be.exception.NotFoundException;
import org.example.ams_be.repository.EmployeeRepository;
import org.example.ams_be.utils.PaginationUtil;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class EmployeeService {

    private final EmployeeRepository employeeRepository;

    public EmployeeService(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    public List<EmployeeDto> getAllEmployees() {
        return employeeRepository.findAll();
    }

    public EmployeeDto getEmployeeById(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy nhân viên"));
    }

    public EmployeeDto create(EmployeeRequest req) {
        if (employeeRepository.existsByEmployeeCode(req.employeeCode)) {
            throw new BadRequestException("Employee code đã tồn tại");
        }
        if (employeeRepository.existsByEmail(req.email)) {
            throw new BadRequestException("Email đã tồn tại");
        }

        LocalDateTime now = LocalDateTime.now();
        String status = "ACTIVE";

        long newId = employeeRepository.insert(req, status, now);

        return employeeRepository.findById(newId)
                .orElseThrow(() -> new BadRequestException("Tạo nhân viên thất bại"));
    }

    public EmployeeDto update(Long id, EmployeeRequest req) {
        // ensure exists
        EmployeeDto current = employeeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy nhân viên"));

        // Nếu cho phép đổi email: check trùng nhưng bỏ qua email của chính nó
        if (req.email != null && !req.email.equalsIgnoreCase(current.email)) {
            if (employeeRepository.existsByEmail(req.email)) {
                throw new BadRequestException("Email đã tồn tại");
            }
        }

        int updated = employeeRepository.update(id, req, LocalDateTime.now());
        if (updated == 0) {
            throw new BadRequestException("Update thất bại");
        }

        return employeeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy nhân viên"));
    }

    public void delete(Long id) {
        // optional: check exist first
        employeeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy nhân viên"));

        employeeRepository.deleteById(id);
    }

    public PageResponse<EmployeeDto> getEmployeesPage(Integer page, Integer size, String sortBy, String sortDir) {
        int p = PaginationUtil.resolvePage(page);
        int s = PaginationUtil.resolveSize(size);

        String sb = PaginationUtil.resolveSortBy(sortBy, "employee_id");
        String sd = PaginationUtil.resolveSortDir(sortDir);

        int offset = (p - 1) * s;

        long total = employeeRepository.countAll();
        List<EmployeeDto> items = employeeRepository.findPage(offset, s, sb, sd);

        return new PageResponse<>(items, p, s, total);
    }

    public PageResponse<EmployeeDto> searchEmployeesByName(Integer page, Integer size, String name, String sortBy, String sortDir) {
        int p = PaginationUtil.resolvePage(page);
        int s = PaginationUtil.resolveSize(size);

        String sb = PaginationUtil.resolveSortBy(sortBy, "employee_id");
        String sd = PaginationUtil.resolveSortDir(sortDir);

        // name bắt buộc có (tránh search null)
        String keyword = (name == null) ? "" : name.trim();
        if (keyword.isBlank()) {
            // Nếu bạn muốn: return page thường thay vì báo lỗi
            long total = employeeRepository.countAll();
            List<EmployeeDto> items = employeeRepository.findPage((p - 1) * s, s, sb, sd);
            return new PageResponse<>(items, p, s, total);
            // Hoặc throw BadRequestException("name không được để trống");
        }

        int offset = (p - 1) * s;

        long total = employeeRepository.countByName(keyword);
        List<EmployeeDto> items = employeeRepository.findPageByName(offset, s, keyword, sb, sd);

        return new PageResponse<>(items, p, s, total);
    }

}
