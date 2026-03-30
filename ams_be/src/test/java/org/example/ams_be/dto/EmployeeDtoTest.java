package org.example.ams_be.dto;

import org.example.ams_be.support.LombokPojoBranchAssertions;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.function.UnaryOperator;

class EmployeeDtoTest {

    @Test
    void equalsAndHashCodeCoverGeneratedBranches() {
        LombokPojoBranchAssertions.assertEqualsAndHashCodeBranches(
                this::populated,
                EmployeeDto::new,
                populatedMismatchMutators(),
                emptyMismatchMutators(),
                dto -> new NonEqualEmployeeDto(dto)
        );
    }

    private List<UnaryOperator<EmployeeDto>> populatedMismatchMutators() {
        return List.of(
                dto -> setEmployeeId(dto, 2L),
                dto -> setEmployeeCode(dto, "EMP-2"),
                dto -> setFullName(dto, "Bob"),
                dto -> setDob(dto, LocalDate.of(1999, 2, 2)),
                dto -> setGender(dto, "F"),
                dto -> setPhone(dto, "0999"),
                dto -> setEmail(dto, "bob@company.com"),
                dto -> setStatus(dto, "INACTIVE"),
                dto -> setDepartmentId(dto, 20L),
                dto -> setPositionId(dto, 30L),
                dto -> setManagerId(dto, 40L),
                dto -> setHireDate(dto, LocalDate.of(2025, 2, 1)),
                dto -> setTerminatedDate(dto, LocalDate.of(2026, 3, 20)),
                dto -> setCreatedAt(dto, LocalDateTime.of(2025, 1, 1, 9, 0)) //,
                // dto -> setUpdatedAt(dto, LocalDateTime.of(2026, 3, 19, 9, 0))
        );
    }

    private List<UnaryOperator<EmployeeDto>> emptyMismatchMutators() {
        return List.of(
                dto -> setEmployeeId(dto, 1L),
                dto -> setEmployeeCode(dto, "EMP-1"),
                dto -> setFullName(dto, "Alice"),
                dto -> setDob(dto, LocalDate.of(2000, 1, 1)),
                dto -> setGender(dto, "M"),
                dto -> setPhone(dto, "0123"),
                dto -> setEmail(dto, "alice@company.com"),
                dto -> setStatus(dto, "ACTIVE"),
                dto -> setDepartmentId(dto, 10L),
                dto -> setPositionId(dto, 20L),
                dto -> setManagerId(dto, 30L),
                dto -> setHireDate(dto, LocalDate.of(2025, 1, 1)),
                dto -> setTerminatedDate(dto, LocalDate.of(2026, 3, 19)),
                dto -> setCreatedAt(dto, LocalDateTime.of(2025, 1, 1, 8, 0)) //,
                // dto -> setUpdatedAt(dto, LocalDateTime.of(2026, 3, 19, 8, 0))
        );
    }

    private EmployeeDto populated() {
        EmployeeDto dto = new EmployeeDto();
        dto.setEmployeeId(1L);
        dto.setEmployeeCode("EMP-1");
        dto.setFullName("Alice");
        dto.setDob(LocalDate.of(2000, 1, 1));
        dto.setGender("M");
        dto.setPhone("0123");
        dto.setEmail("alice@company.com");
        dto.setStatus("ACTIVE");
        dto.setDepartmentId(10L);
        dto.setPositionId(20L);
        dto.setManagerId(30L);
        dto.setHireDate(LocalDate.of(2025, 1, 1));
        dto.setTerminatedDate(LocalDate.of(2026, 3, 19));
        dto.setCreatedAt(LocalDateTime.of(2025, 1, 1, 8, 0));
        // dto.setUpdatedAt(LocalDateTime.of(2026, 3, 19, 8, 0));
        return dto;
    }

    private EmployeeDto setEmployeeId(EmployeeDto dto, Long value) { dto.setEmployeeId(value); return dto; }
    private EmployeeDto setEmployeeCode(EmployeeDto dto, String value) { dto.setEmployeeCode(value); return dto; }
    private EmployeeDto setFullName(EmployeeDto dto, String value) { dto.setFullName(value); return dto; }
    private EmployeeDto setDob(EmployeeDto dto, LocalDate value) { dto.setDob(value); return dto; }
    private EmployeeDto setGender(EmployeeDto dto, String value) { dto.setGender(value); return dto; }
    private EmployeeDto setPhone(EmployeeDto dto, String value) { dto.setPhone(value); return dto; }
    private EmployeeDto setEmail(EmployeeDto dto, String value) { dto.setEmail(value); return dto; }
    private EmployeeDto setStatus(EmployeeDto dto, String value) { dto.setStatus(value); return dto; }
    private EmployeeDto setDepartmentId(EmployeeDto dto, Long value) { dto.setDepartmentId(value); return dto; }
    private EmployeeDto setPositionId(EmployeeDto dto, Long value) { dto.setPositionId(value); return dto; }
    private EmployeeDto setManagerId(EmployeeDto dto, Long value) { dto.setManagerId(value); return dto; }
    private EmployeeDto setHireDate(EmployeeDto dto, LocalDate value) { dto.setHireDate(value); return dto; }
    private EmployeeDto setTerminatedDate(EmployeeDto dto, LocalDate value) { dto.setTerminatedDate(value); return dto; }
    private EmployeeDto setCreatedAt(EmployeeDto dto, LocalDateTime value) { dto.setCreatedAt(value); return dto; }
    // private EmployeeDto setUpdatedAt(EmployeeDto dto, LocalDateTime value) { dto.setUpdatedAt(value); return dto; }

    private static final class NonEqualEmployeeDto extends EmployeeDto {
        private NonEqualEmployeeDto(EmployeeDto base) {
            setEmployeeId(base.getEmployeeId());
            setEmployeeCode(base.getEmployeeCode());
            setFullName(base.getFullName());
            setDob(base.getDob());
            setGender(base.getGender());
            setPhone(base.getPhone());
            setEmail(base.getEmail());
            setStatus(base.getStatus());
            setDepartmentId(base.getDepartmentId());
            setPositionId(base.getPositionId());
            setManagerId(base.getManagerId());
            setHireDate(base.getHireDate());
            setTerminatedDate(base.getTerminatedDate());
            setCreatedAt(base.getCreatedAt());
            // setUpdatedAt(base.getUpdatedAt());
        }

        @Override
        protected boolean canEqual(Object other) {
            return false;
        }
    }
}
