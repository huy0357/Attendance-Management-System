package org.example.ams_be.service;

import org.example.ams_be.dto.EmployeeDto;
import org.example.ams_be.dto.request.EmployeeRequest;
import org.example.ams_be.dto.response.PageResponse;
import org.example.ams_be.entity.Account;
import org.example.ams_be.exception.BadRequestException;
import org.example.ams_be.exception.NotFoundException;
import org.example.ams_be.repository.AccountRepository;
import org.example.ams_be.repository.EmployeeRepository;
import org.example.ams_be.utils.PaginationUtil;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final AuditLogService auditLogService;
    private final AccountRepository accountRepository;

    public EmployeeService(EmployeeRepository employeeRepository,
            AuditLogService auditLogService,
            AccountRepository accountRepository) {
        this.employeeRepository = employeeRepository;
        this.auditLogService = auditLogService;
        this.accountRepository = accountRepository;
    }

    /**
     * Helper lấy employeeId của người đang thực hiện thao tác từ SecurityContext
     */
    private Long getCurrentActorId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated())
            return null;

        return accountRepository.findByUsername(auth.getName())
                .map(Account::getEmployeeId)
                .orElse(null);
    }

    public List<EmployeeDto> getAllEmployees() {
        return employeeRepository.findAll();
    }

    public EmployeeDto getEmployeeById(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy nhân viên"));
    }

    @Transactional
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

        EmployeeDto savedDto = employeeRepository.findById(newId)
                .orElseThrow(() -> new BadRequestException("Tạo nhân viên thất bại"));

        // Ghi log CREATE
        auditLogService.saveAuditLog("CREATE", "EMPLOYEE", newId, getCurrentActorId(), null, "ADD EMPLOYEE SUCCESSFUL"); // THAY ADD EMPLOYEE SUCCESSFUL bằng savedDto

        return savedDto;
    }

    @Transactional
    public EmployeeDto update(Long id, EmployeeRequest req) {
        EmployeeDto current = employeeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy nhân viên"));

        if (req.email != null && !req.email.equalsIgnoreCase(current.email)) {
            if (employeeRepository.existsByEmail(req.email)) {
                throw new BadRequestException("Email đã tồn tại");
            }
        }

        int updated = employeeRepository.update(id, req, LocalDateTime.now());
        if (updated == 0) {
            throw new BadRequestException("Update thất bại");
        }

        EmployeeDto updatedDto = employeeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy nhân viên"));

        // Ghi log UPDATE
        auditLogService.saveAuditLog("UPDATE", "EMPLOYEE", id,
                getCurrentActorId(), current, "UPDATE EMPLOYEE SUCCESSFUL"); //updatedDto

        return updatedDto;
    }

    @Transactional
    public void delete(Long id) {
        EmployeeDto current = employeeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy nhân viên"));

        employeeRepository.deleteById(id);
        auditLogService.saveAuditLog("DELETE", "EMPLOYEE", id,
                getCurrentActorId(), current, null);
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

    public PageResponse<EmployeeDto> searchEmployeesByName(Integer page, Integer size, String name, String sortBy,
            String sortDir) {
        int p = PaginationUtil.resolvePage(page);
        int s = PaginationUtil.resolveSize(size);
        String sb = PaginationUtil.resolveSortBy(sortBy, "employee_id");
        String sd = PaginationUtil.resolveSortDir(sortDir);
        String keyword = (name == null) ? "" : name.trim();
        if (keyword.isBlank()) {
            long total = employeeRepository.countAll();
            List<EmployeeDto> items = employeeRepository.findPage((p - 1) * s, s, sb, sd);
            return new PageResponse<>(items, p, s, total);
        }
        int offset = (p - 1) * s;
        long total = employeeRepository.countByName(keyword);
        List<EmployeeDto> items = employeeRepository.findPageByName(offset, s, keyword, sb, sd);
        return new PageResponse<>(items, p, s, total);
    }
}