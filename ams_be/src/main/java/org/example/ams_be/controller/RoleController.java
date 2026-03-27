package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.request.AssignRoleRequest;
import org.example.ams_be.dto.response.RoleResponse;
import org.example.ams_be.service.RoleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class RoleController {

    private final RoleService roleService;

    @GetMapping("/roles")
    public ResponseEntity<List<RoleResponse>> getAllRoles() {
        return ResponseEntity.ok(roleService.getAllRoles());
    }

    @GetMapping("/employees/{employeeId}/roles")
    public ResponseEntity<List<RoleResponse>> getEmployeeRoles(@PathVariable Long employeeId) {
        return ResponseEntity.ok(roleService.getRolesByEmployeeId(employeeId));
    }

    @PostMapping("/employees/{employeeId}/roles")
    public ResponseEntity<?> assignRoleToEmployee(@PathVariable Long employeeId,
                                                  @RequestBody AssignRoleRequest request) {
        roleService.assignRoleToEmployee(employeeId, request.getRoleId());
        return ResponseEntity.ok(Map.of("message", "Gán quyền thành công"));
    }

    @DeleteMapping("/employees/{employeeId}/roles/{roleId}")
    public ResponseEntity<?> removeRoleFromEmployee(@PathVariable Long employeeId,
                                                    @PathVariable Long roleId) {
        roleService.removeRoleFromEmployee(employeeId, roleId);
        return ResponseEntity.ok(Map.of("message", "Xóa quyền thành công"));
    }
}