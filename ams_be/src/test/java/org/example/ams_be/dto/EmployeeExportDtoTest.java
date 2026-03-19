package org.example.ams_be.dto;

import org.example.ams_be.support.LombokPojoBranchAssertions;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.function.UnaryOperator;

class EmployeeExportDtoTest {

    @Test
    void equalsAndHashCodeCoverGeneratedBranches() {
        LombokPojoBranchAssertions.assertEqualsAndHashCodeBranches(
                this::populated,
                EmployeeExportDto::new,
                populatedMismatchMutators(),
                emptyMismatchMutators(),
                dto -> new NonEqualEmployeeExportDto(dto)
        );
    }

    private List<UnaryOperator<EmployeeExportDto>> populatedMismatchMutators() {
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
                dto -> setCreatedAt(dto, LocalDateTime.of(2025, 1, 1, 9, 0))
        );
    }

    private List<UnaryOperator<EmployeeExportDto>> emptyMismatchMutators() {
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
                dto -> setCreatedAt(dto, LocalDateTime.of(2025, 1, 1, 8, 0))
        );
    }

    private EmployeeExportDto populated() {
        return EmployeeExportDto.builder()
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
                .build();
    }

    private EmployeeExportDto setEmployeeId(EmployeeExportDto dto, Long value) { dto.setEmployeeId(value); return dto; }
    private EmployeeExportDto setEmployeeCode(EmployeeExportDto dto, String value) { dto.setEmployeeCode(value); return dto; }
    private EmployeeExportDto setFullName(EmployeeExportDto dto, String value) { dto.setFullName(value); return dto; }
    private EmployeeExportDto setDob(EmployeeExportDto dto, LocalDate value) { dto.setDob(value); return dto; }
    private EmployeeExportDto setGender(EmployeeExportDto dto, String value) { dto.setGender(value); return dto; }
    private EmployeeExportDto setPhone(EmployeeExportDto dto, String value) { dto.setPhone(value); return dto; }
    private EmployeeExportDto setEmail(EmployeeExportDto dto, String value) { dto.setEmail(value); return dto; }
    private EmployeeExportDto setStatus(EmployeeExportDto dto, String value) { dto.setStatus(value); return dto; }
    private EmployeeExportDto setDepartmentId(EmployeeExportDto dto, Long value) { dto.setDepartmentId(value); return dto; }
    private EmployeeExportDto setPositionId(EmployeeExportDto dto, Long value) { dto.setPositionId(value); return dto; }
    private EmployeeExportDto setManagerId(EmployeeExportDto dto, Long value) { dto.setManagerId(value); return dto; }
    private EmployeeExportDto setHireDate(EmployeeExportDto dto, LocalDate value) { dto.setHireDate(value); return dto; }
    private EmployeeExportDto setTerminatedDate(EmployeeExportDto dto, LocalDate value) { dto.setTerminatedDate(value); return dto; }
    private EmployeeExportDto setCreatedAt(EmployeeExportDto dto, LocalDateTime value) { dto.setCreatedAt(value); return dto; }

    private static final class NonEqualEmployeeExportDto extends EmployeeExportDto {
        private NonEqualEmployeeExportDto(EmployeeExportDto base) {
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
        }

        @Override
        protected boolean canEqual(Object other) {
            return false;
        }
    }
}
