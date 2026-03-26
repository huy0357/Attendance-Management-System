package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.response.RoleResponse;
import org.example.ams_be.entity.Account;
import org.example.ams_be.entity.Role;
import org.example.ams_be.repository.AccountRepository;
import org.example.ams_be.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final AccountRepository accountRepository;

    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<RoleResponse> getRolesByEmployeeId(Long employeeId) {
        Account account = accountRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy account của employee"));

        if (account.getRole() == null) {
            return Collections.emptyList();
        }

        return List.of(mapToResponse(account.getRole()));
    }

    @Transactional
    public void assignRoleToEmployee(Long employeeId, Long roleId) {
        Account account = accountRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy account của employee"));

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Role không tồn tại"));

        if (account.getRole() != null && roleId.equals(account.getRole().getRoleId())) {
            throw new RuntimeException("Employee đã có role này");
        }

        account.setRole(role);
        accountRepository.save(account);
    }

    @Transactional
    public void removeRoleFromEmployee(Long employeeId, Long roleId) {
        Account account = accountRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy account của employee"));

        if (account.getRole() == null) {
            throw new RuntimeException("Employee hiện không có role");
        }

        if (!account.getRole().getRoleId().equals(roleId)) {
            throw new RuntimeException("Role cần xóa không khớp với role hiện tại của employee");
        }

        account.setRole(null);
        accountRepository.save(account);
    }

    private RoleResponse mapToResponse(Role r) {
        return new RoleResponse(
                r.getRoleId(),
                r.getRoleCode(),
                r.getRoleName(),
                r.getDescription()
        );
    }
}