package org.example.ams_be.dto.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateAccountRequest {
    private Long employeeId;
    private String username;
    private String password;
    private Long roleId;      // FK tới bảng roles
    private Boolean isActive; // optional
}