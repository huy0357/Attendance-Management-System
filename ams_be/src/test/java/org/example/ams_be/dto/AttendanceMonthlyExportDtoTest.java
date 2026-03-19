package org.example.ams_be.dto;

import org.example.ams_be.support.LombokPojoBranchAssertions;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.function.UnaryOperator;

class AttendanceMonthlyExportDtoTest {

    @Test
    void equalsAndHashCodeCoverGeneratedBranches() {
        LombokPojoBranchAssertions.assertEqualsAndHashCodeBranches(
                this::populated,
                AttendanceMonthlyExportDto::new,
                populatedMismatchMutators(),
                emptyMismatchMutators(),
                dto -> new NonEqualAttendanceMonthlyExportDto(dto)
        );
    }

    private List<UnaryOperator<AttendanceMonthlyExportDto>> populatedMismatchMutators() {
        return List.of(
                dto -> setMonthKey(dto, "2026-04"),
                dto -> setEmployeeId(dto, 2L),
                dto -> setEmployeeCode(dto, "EMP-2"),
                dto -> setFullName(dto, "Bob"),
                dto -> setEmail(dto, "bob@company.com"),
                dto -> setDepartmentId(dto, 20L),
                dto -> setWorkDays(dto, BigDecimal.valueOf(19.5)),
                dto -> setLeaveDays(dto, BigDecimal.valueOf(2.0)),
                dto -> setAbsentDays(dto, BigDecimal.valueOf(1.0)),
                dto -> setLateMinutes(dto, 30),
                dto -> setOtMinutes(dto, 120),
                dto -> setGeneratedAt(dto, LocalDateTime.of(2026, 3, 31, 23, 59))
        );
    }

    private List<UnaryOperator<AttendanceMonthlyExportDto>> emptyMismatchMutators() {
        return List.of(
                dto -> setMonthKey(dto, "2026-03"),
                dto -> setEmployeeId(dto, 1L),
                dto -> setEmployeeCode(dto, "EMP-1"),
                dto -> setFullName(dto, "Alice"),
                dto -> setEmail(dto, "alice@company.com"),
                dto -> setDepartmentId(dto, 10L),
                dto -> setWorkDays(dto, BigDecimal.valueOf(20.5)),
                dto -> setLeaveDays(dto, BigDecimal.ONE),
                dto -> setAbsentDays(dto, BigDecimal.ZERO),
                dto -> setLateMinutes(dto, 15),
                dto -> setOtMinutes(dto, 90),
                dto -> setGeneratedAt(dto, LocalDateTime.of(2026, 3, 31, 18, 0))
        );
    }

    private AttendanceMonthlyExportDto populated() {
        return AttendanceMonthlyExportDto.builder()
                .monthKey("2026-03")
                .employeeId(1L)
                .employeeCode("EMP-1")
                .fullName("Alice")
                .email("alice@company.com")
                .departmentId(10L)
                .workDays(BigDecimal.valueOf(20.5))
                .leaveDays(BigDecimal.ONE)
                .absentDays(BigDecimal.ZERO)
                .lateMinutes(15)
                .otMinutes(90)
                .generatedAt(LocalDateTime.of(2026, 3, 31, 18, 0))
                .build();
    }

    private AttendanceMonthlyExportDto setMonthKey(AttendanceMonthlyExportDto dto, String value) { dto.setMonthKey(value); return dto; }
    private AttendanceMonthlyExportDto setEmployeeId(AttendanceMonthlyExportDto dto, Long value) { dto.setEmployeeId(value); return dto; }
    private AttendanceMonthlyExportDto setEmployeeCode(AttendanceMonthlyExportDto dto, String value) { dto.setEmployeeCode(value); return dto; }
    private AttendanceMonthlyExportDto setFullName(AttendanceMonthlyExportDto dto, String value) { dto.setFullName(value); return dto; }
    private AttendanceMonthlyExportDto setEmail(AttendanceMonthlyExportDto dto, String value) { dto.setEmail(value); return dto; }
    private AttendanceMonthlyExportDto setDepartmentId(AttendanceMonthlyExportDto dto, Long value) { dto.setDepartmentId(value); return dto; }
    private AttendanceMonthlyExportDto setWorkDays(AttendanceMonthlyExportDto dto, BigDecimal value) { dto.setWorkDays(value); return dto; }
    private AttendanceMonthlyExportDto setLeaveDays(AttendanceMonthlyExportDto dto, BigDecimal value) { dto.setLeaveDays(value); return dto; }
    private AttendanceMonthlyExportDto setAbsentDays(AttendanceMonthlyExportDto dto, BigDecimal value) { dto.setAbsentDays(value); return dto; }
    private AttendanceMonthlyExportDto setLateMinutes(AttendanceMonthlyExportDto dto, Integer value) { dto.setLateMinutes(value); return dto; }
    private AttendanceMonthlyExportDto setOtMinutes(AttendanceMonthlyExportDto dto, Integer value) { dto.setOtMinutes(value); return dto; }
    private AttendanceMonthlyExportDto setGeneratedAt(AttendanceMonthlyExportDto dto, LocalDateTime value) { dto.setGeneratedAt(value); return dto; }

    private static final class NonEqualAttendanceMonthlyExportDto extends AttendanceMonthlyExportDto {
        private NonEqualAttendanceMonthlyExportDto(AttendanceMonthlyExportDto base) {
            setMonthKey(base.getMonthKey());
            setEmployeeId(base.getEmployeeId());
            setEmployeeCode(base.getEmployeeCode());
            setFullName(base.getFullName());
            setEmail(base.getEmail());
            setDepartmentId(base.getDepartmentId());
            setWorkDays(base.getWorkDays());
            setLeaveDays(base.getLeaveDays());
            setAbsentDays(base.getAbsentDays());
            setLateMinutes(base.getLateMinutes());
            setOtMinutes(base.getOtMinutes());
            setGeneratedAt(base.getGeneratedAt());
        }

        @Override
        protected boolean canEqual(Object other) {
            return false;
        }
    }
}
