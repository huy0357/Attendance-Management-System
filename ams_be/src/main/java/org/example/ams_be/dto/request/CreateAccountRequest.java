package org.example.ams_be.dto.request;

import lombok.*;
import org.example.ams_be.entity.Account;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class CreateAccountRequest {
    private Long employeeId;
    private String username;
    private String password;     // nhận password plain text từ client
    private Account.Role role;   // admin/hr/manager/employee
    private Boolean isActive;    // optional
}
