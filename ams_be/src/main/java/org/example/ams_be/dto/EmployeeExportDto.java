package org.example.ams_be.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeExportDto {

    private Long employeeId;
    private String employeeCode;
    private String fullName;
    private LocalDate dob;
    private String gender;
    private String phone;
    private String email;
    private String status;
    private Long departmentId;
    private Long positionId;
    private Long managerId;
    private LocalDate hireDate;
    private LocalDate terminatedDate;
    private LocalDateTime createdAt;
}