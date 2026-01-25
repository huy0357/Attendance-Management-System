package org.example.ams_be.dto.response;

import lombok.*;
import org.example.ams_be.entity.Account;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class AccountResponse {
    private Long accountId;
    private Long employeeId;
    private String username;
    private Account.Role role;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
