package org.example.ams_be.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfileResponse {

    private Long accountId;
    private Long employeeId;
    private String employeeCode;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String gender;
    private LocalDate dob;
    private String role;
    private String status;
    private Long departmentId;
    private String departmentName;
    private Long positionId;
    private Long managerId;
    private String managerName;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
}