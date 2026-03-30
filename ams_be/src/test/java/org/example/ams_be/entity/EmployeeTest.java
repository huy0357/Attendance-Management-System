package org.example.ams_be.entity;

import org.example.ams_be.support.LombokPojoBranchAssertions;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.function.UnaryOperator;

class EmployeeTest {

    @Test
    void equalsAndHashCodeCoverGeneratedBranches() {
        LombokPojoBranchAssertions.assertEqualsAndHashCodeBranches(
                this::populated,
                () -> new Employee(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
                populatedMismatchMutators(),
                emptyMismatchMutators(),
                employee -> new NonEqualEmployee(employee));
    }

    private List<UnaryOperator<Employee>> populatedMismatchMutators() {
        return List.of(
                employee -> setEmployeeId(employee, 2L),
                employee -> setEmployeeCode(employee, "EMP-2"),
                employee -> setFullName(employee, "Bob"),
                employee -> setDob(employee, LocalDate.of(1999, 2, 2)),
                employee -> setGender(employee, "F"),
                employee -> setPhone(employee, "0999"),
                employee -> setEmail(employee, "bob@company.com"),
                employee -> setStatus(employee, "INACTIVE"),
                employee -> setDepartmentId(employee, 20L),
                employee -> setPositionId(employee, 30L),
                employee -> setManagerId(employee, 40L),
                employee -> setHireDate(employee, LocalDate.of(2025, 2, 1)),
                employee -> setTerminatedDate(employee, LocalDate.of(2026, 3, 20)),
                employee -> setCreatedAt(employee, LocalDateTime.of(2025, 1, 1, 9, 0)),
                employee -> setAvatarUrl(employee, "/avatars/bob.png")
        );
    }

    private List<UnaryOperator<Employee>> emptyMismatchMutators() {
        return List.of(
                employee -> setEmployeeId(employee, 1L),
                employee -> setEmployeeCode(employee, "EMP-1"),
                employee -> setFullName(employee, "Alice"),
                employee -> setDob(employee, LocalDate.of(2000, 1, 1)),
                employee -> setGender(employee, "M"),
                employee -> setPhone(employee, "0123"),
                employee -> setEmail(employee, "alice@company.com"),
                employee -> setStatus(employee, "ACTIVE"),
                employee -> setDepartmentId(employee, 10L),
                employee -> setPositionId(employee, 20L),
                employee -> setManagerId(employee, 30L),
                employee -> setHireDate(employee, LocalDate.of(2025, 1, 1)),
                employee -> setTerminatedDate(employee, LocalDate.of(2026, 3, 19)),
                employee -> setCreatedAt(employee, LocalDateTime.of(2025, 1, 1, 8, 0)),
                employee -> setAvatarUrl(employee, "/avatars/alice.png")
        );
    }

    private Employee populated() {
        return Employee.builder()
                .employeeId(1L)
                .employeeCode("EMP-1")
                .fullName("Alice")
                .dob(LocalDate.of(2000, 1, 1))
                .gender("M")
                .phone("0123")
                .email("alice@company.com")
                .status("ACTIVE")
                .departmentId(10L)
                .positionId(20L)
                .managerId(30L)
                .hireDate(LocalDate.of(2025, 1, 1))
                .terminatedDate(LocalDate.of(2026, 3, 19))
                .createdAt(LocalDateTime.of(2025, 1, 1, 8, 0))
                .avatarUrl("/avatars/alice.png")
                .build();
    }

    private Employee setEmployeeId(Employee employee, Long value) { employee.setEmployeeId(value); return employee; }
    private Employee setEmployeeCode(Employee employee, String value) { employee.setEmployeeCode(value); return employee; }
    private Employee setFullName(Employee employee, String value) { employee.setFullName(value); return employee; }
    private Employee setDob(Employee employee, LocalDate value) { employee.setDob(value); return employee; }
    private Employee setGender(Employee employee, String value) { employee.setGender(value); return employee; }
    private Employee setPhone(Employee employee, String value) { employee.setPhone(value); return employee; }
    private Employee setEmail(Employee employee, String value) { employee.setEmail(value); return employee; }
    private Employee setStatus(Employee employee, String value) { employee.setStatus(value); return employee; }
    private Employee setDepartmentId(Employee employee, Long value) { employee.setDepartmentId(value); return employee; }
    private Employee setPositionId(Employee employee, Long value) { employee.setPositionId(value); return employee; }
    private Employee setManagerId(Employee employee, Long value) { employee.setManagerId(value); return employee; }
    private Employee setHireDate(Employee employee, LocalDate value) { employee.setHireDate(value); return employee; }
    private Employee setTerminatedDate(Employee employee, LocalDate value) { employee.setTerminatedDate(value); return employee; }
    private Employee setCreatedAt(Employee employee, LocalDateTime value) { employee.setCreatedAt(value); return employee; }
    private Employee setAvatarUrl(Employee employee, String value) { employee.setAvatarUrl(value); return employee; }

    private static final class NonEqualEmployee extends Employee {
        private NonEqualEmployee(Employee base) {
            super(
                    base.getEmployeeId(),
                    base.getEmployeeCode(),
                    base.getFullName(),
                    base.getDob(),
                    base.getGender(),
                    base.getPhone(),
                    base.getEmail(),
                    base.getStatus(),
                    base.getDepartmentId(),
                    base.getPositionId(),
                    base.getManagerId(),
                    base.getHireDate(),
                    base.getTerminatedDate(),
                    base.getCreatedAt(),
                    base.getAvatarUrl()
            );
        }

        @Override
        @SuppressWarnings("squid:S00120") // Lombok canEqual pattern
        protected boolean canEqual(Object other) {
            return false;
        }
    }
}