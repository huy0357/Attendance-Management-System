package org.example.ams_be.repository;

import org.example.ams_be.dto.EmployeeDto;
import org.example.ams_be.dto.request.EmployeeRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class EmployeeRepository {

    private final JdbcTemplate jdbcTemplate;

    public EmployeeRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ✅ CHỈ GIỮ 1 MAPPER DUY NHẤT
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

    public Optional<EmployeeDto> findById(Long employeeId) {
        String sql = """
                SELECT employee_id, employee_code, full_name, dob, gender, phone, email, status,
                       department_id, position_id, manager_id, hire_date, terminated_date, created_at, updated_at
                FROM employees
                WHERE employee_id = ?
                """;
        List<EmployeeDto> list = jdbcTemplate.query(sql, EMPLOYEE_MAPPER, employeeId);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public boolean existsByEmployeeCode(String employeeCode) {
        String sql = "SELECT COUNT(1) FROM employees WHERE employee_code = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, employeeCode);
        return count != null && count > 0;
    }

    public boolean existsByEmail(String email) {
        String sql = "SELECT COUNT(1) FROM employees WHERE email = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, email);
        return count != null && count > 0;
    }

    public long insert(EmployeeRequest req, String status, LocalDateTime createdAt) {
        String sql = """
                INSERT INTO employees
                    (employee_code, full_name, dob, gender, phone, email, status,
                     department_id, position_id, manager_id, hire_date, created_at, updated_at)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?,
                     ?, ?, ?, ?, ?, ?)
                """;

        jdbcTemplate.update(
                sql,
                req.employeeCode,
                req.fullName,
                req.dob,
                req.gender,
                req.phone,
                req.email,
                status,
                req.departmentId,
                req.positionId,
                req.managerId,
                req.hireDate,
                Timestamp.valueOf(createdAt),
                Timestamp.valueOf(createdAt)
        );

        // MySQL: lấy ID vừa insert
        Long id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        return id != null ? id : 0L;
    }

    public int update(Long employeeId, EmployeeRequest req, LocalDateTime updatedAt) {
        String sql = """
                UPDATE employees
                SET full_name = ?,
                    dob = ?,
                    gender = ?,
                    phone = ?,
                    email = ?,
                    department_id = ?,
                    position_id = ?,
                    manager_id = ?,
                    hire_date = ?,
                    updated_at = ?
                WHERE employee_id = ?
                """;

        return jdbcTemplate.update(
                sql,
                req.fullName,
                req.dob,
                req.gender,
                req.phone,
                req.email,
                req.departmentId,
                req.positionId,
                req.managerId,
                req.hireDate,
                Timestamp.valueOf(updatedAt),
                employeeId
        );
    }

    public int deleteById(Long employeeId) {
        String sql = "DELETE FROM employees WHERE employee_id = ?";
        return jdbcTemplate.update(sql, employeeId);
    }

    public long countAll() {
        String sql = "SELECT COUNT(1) FROM employees";
        Long total = jdbcTemplate.queryForObject(sql, Long.class);
        return total != null ? total : 0L;
    }

    public List<EmployeeDto> findPage(int offset, int limit, String sortBy, String sortDir) {
        // Whitelist columns để tránh SQL injection
        String safeSortBy = switch (sortBy) {
            case "employee_id", "employee_code", "full_name", "email",
                 "status", "department_id", "position_id", "manager_id",
                 "hire_date", "terminated_date", "created_at", "updated_at" -> sortBy;
            default -> "employee_id";
        };

        String safeSortDir = "asc".equalsIgnoreCase(sortDir) ? "ASC" : "DESC";

        String sql = """
                SELECT employee_id, employee_code, full_name, dob, gender, phone, email, status,
                       department_id, position_id, manager_id, hire_date, terminated_date, created_at, updated_at
                FROM employees
                ORDER BY %s %s
                LIMIT ? OFFSET ?
                """.formatted(safeSortBy, safeSortDir);

        return jdbcTemplate.query(sql, EMPLOYEE_MAPPER, limit, offset);
    }

    public long countByName(String name) {
        String sql = "SELECT COUNT(1) FROM employees WHERE full_name LIKE ?";
        String keyword = "%" + name.trim() + "%";
        Long total = jdbcTemplate.queryForObject(sql, Long.class, keyword);
        return total != null ? total : 0L;
    }

    public List<EmployeeDto> findPageByName(int offset, int limit, String name, String sortBy, String sortDir) {

        String safeSortBy = switch (sortBy) {
            case "employee_id", "employee_code", "full_name", "email",
                 "status", "department_id", "position_id", "manager_id",
                 "hire_date", "terminated_date", "created_at", "updated_at" -> sortBy;
            default -> "employee_id";
        };

        String safeSortDir = "asc".equalsIgnoreCase(sortDir) ? "ASC" : "DESC";
        String keyword = "%" + name.trim() + "%";

        String sql = """
            SELECT employee_id, employee_code, full_name, dob, gender, phone, email, status,
                   department_id, position_id, manager_id, hire_date, terminated_date, created_at, updated_at
            FROM employees
            WHERE full_name LIKE ?
            ORDER BY %s %s
            LIMIT ? OFFSET ?
            """.formatted(safeSortBy, safeSortDir);

        return jdbcTemplate.query(sql, EMPLOYEE_MAPPER, keyword, limit, offset);
    }

}
