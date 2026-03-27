package org.example.ams_be.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountResponse {
    private Long accountId;
    private Long employeeId;
    private String username;

    private Long roleId;
    private String roleCode;

    private Boolean isActive;
    private LocalDateTime createdAt;
}