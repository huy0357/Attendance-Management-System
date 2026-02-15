package org.example.ams_be.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Data;

@Data
public class EmployeeDto {
    public Long employeeId;
    public String employeeCode;
    public String fullName;
    public LocalDate dob;
    public String gender;
    public String phone;
    public String email;
    public String status;
    public Long departmentId;
    public Long positionId;
    public Long managerId;
    public LocalDate hireDate;
    public LocalDate terminatedDate;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;
}
