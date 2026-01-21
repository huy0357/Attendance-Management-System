package org.example.ams_be.repository;

import org.example.ams_be.dto.EmployeeDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

@Repository
public class EmployeeRepository {

    private final JdbcTemplate jdbcTemplate;

    public EmployeeRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private static final RowMapper<EmployeeDto> EMPLOYEE_MAPPER = new RowMapper<>() {
        @Override
        public EmployeeDto mapRow(ResultSet rs, int rowNum) throws SQLException {
            EmployeeDto e = new EmployeeDto();
            e.employeeId = rs.getLong("employee_id");
            e.employeeCode = rs.getString("employee_code");
            e.fullName = rs.getString("full_name");
            e.dob = rs.getObject("dob", java.time.LocalDate.class);
            e.gender = rs.getString("gender");
            e.phone = rs.getString("phone");
            e.email = rs.getString("email");
            e.status = rs.getString("status");
            e.departmentId = rs.getLong("department_id");

            // nullable columns -> dùng getObject để không bị 0 giả
            e.positionId = rs.getObject("position_id", Long.class);
            e.managerId = rs.getObject("manager_id", Long.class);

            e.hireDate = rs.getObject("hire_date", java.time.LocalDate.class);
            e.terminatedDate = rs.getObject("terminated_date", java.time.LocalDate.class);

            e.createdAt = rs.getObject("created_at", java.time.LocalDateTime.class);
            e.updatedAt = rs.getObject("updated_at", java.time.LocalDateTime.class);
            return e;
        }
    };

    public List<EmployeeDto> findAll() {
        String sql = """
        SELECT employee_id, employee_code, full_name, dob, gender, phone, email, status,
               department_id, position_id, manager_id, hire_date, terminated_date, created_at, updated_at
        FROM employees
        ORDER BY employee_id DESC
        """;
        return jdbcTemplate.query(sql, EMPLOYEE_MAPPER);
    }
}
