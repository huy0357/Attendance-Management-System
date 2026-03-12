package org.example.ams_be.repository;

import org.example.ams_be.dto.EmployeeExportDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class EmployeeExportRepository {

    private final JdbcTemplate jdbcTemplate;

    public EmployeeExportRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<EmployeeExportDto> findAllEmployees() {

        String sql = """
            SELECT
                employee_id,
                employee_code,
                full_name,
                dob,
                gender,
                phone,
                email,
                status,
                department_id,
                position_id,
                manager_id,
                hire_date,
                terminated_date,
                created_at
            FROM employees
            ORDER BY employee_id
            """;

        return jdbcTemplate.query(sql, (rs, rowNum) ->
                EmployeeExportDto.builder()
                        .employeeId(rs.getLong("employee_id"))
                        .employeeCode(rs.getString("employee_code"))
                        .fullName(rs.getString("full_name"))
                        .dob(rs.getObject("dob", java.time.LocalDate.class))
                        .gender(rs.getString("gender"))
                        .phone(rs.getString("phone"))
                        .email(rs.getString("email"))
                        .status(rs.getString("status"))
                        .departmentId(rs.getObject("department_id", Long.class))
                        .positionId(rs.getObject("position_id", Long.class))
                        .managerId(rs.getObject("manager_id", Long.class))
                        .hireDate(rs.getObject("hire_date", java.time.LocalDate.class))
                        .terminatedDate(rs.getObject("terminated_date", java.time.LocalDate.class))
                        .createdAt(rs.getObject("created_at", java.time.LocalDateTime.class))
                        .build()
        );
    }
}