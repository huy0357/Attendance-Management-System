package org.example.ams_be.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RoleResponse {
    private Long roleId;
    private String roleCode;
    private String roleName;
    private String description;
}