package org.example.ams_be.dto;

import org.example.ams_be.support.LombokPojoBranchAssertions;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.function.UnaryOperator;

class MonthlyAttendanceEmailDtoTest {

    @Test
    void equalsAndHashCodeCoverGeneratedBranches() {
        LombokPojoBranchAssertions.assertEqualsAndHashCodeBranches(
                this::populated,
                MonthlyAttendanceEmailDto::new,
                populatedMismatchMutators(),
                emptyMismatchMutators(),
                dto -> new NonEqualMonthlyAttendanceEmailDto(dto)
        );
    }

    private List<UnaryOperator<MonthlyAttendanceEmailDto>> populatedMismatchMutators() {
        return List.of(
                dto -> setEmployeeId(dto, 2L),
                dto -> setEmployeeCode(dto, "EMP-2"),
                dto -> setEmployeeName(dto, "Bob"),
                dto -> setEmail(dto, "bob@company.com"),
                dto -> setMonthKey(dto, "2026-04"),
                dto -> setWorkDays(dto, BigDecimal.valueOf(19.5)),
                dto -> setLeaveDays(dto, BigDecimal.valueOf(2.0)),
                dto -> setAbsentDays(dto, BigDecimal.valueOf(1.0)),
                dto -> setLateMinutes(dto, 30),
                dto -> setOtMinutes(dto, 120)
        );
    }

    private List<UnaryOperator<MonthlyAttendanceEmailDto>> emptyMismatchMutators() {
        return List.of(
                dto -> setEmployeeId(dto, 1L),
                dto -> setEmployeeCode(dto, "EMP-1"),
                dto -> setEmployeeName(dto, "Alice"),
                dto -> setEmail(dto, "alice@company.com"),
                dto -> setMonthKey(dto, "2026-03"),
                dto -> setWorkDays(dto, BigDecimal.valueOf(20.5)),
                dto -> setLeaveDays(dto, BigDecimal.ONE),
                dto -> setAbsentDays(dto, BigDecimal.ZERO),
                dto -> setLateMinutes(dto, 15),
                dto -> setOtMinutes(dto, 90)
        );
    }

    private MonthlyAttendanceEmailDto populated() {
        return MonthlyAttendanceEmailDto.builder()
                .employeeId(1L)
                .employeeCode("EMP-1")
                .employeeName("Alice")
                .email("alice@company.com")
                .monthKey("2026-03")
                .workDays(BigDecimal.valueOf(20.5))
                .leaveDays(BigDecimal.ONE)
                .absentDays(BigDecimal.ZERO)
                .lateMinutes(15)
                .otMinutes(90)
                .build();
    }

    private MonthlyAttendanceEmailDto setEmployeeId(MonthlyAttendanceEmailDto dto, Long value) { dto.setEmployeeId(value); return dto; }
    private MonthlyAttendanceEmailDto setEmployeeCode(MonthlyAttendanceEmailDto dto, String value) { dto.setEmployeeCode(value); return dto; }
    private MonthlyAttendanceEmailDto setEmployeeName(MonthlyAttendanceEmailDto dto, String value) { dto.setEmployeeName(value); return dto; }
    private MonthlyAttendanceEmailDto setEmail(MonthlyAttendanceEmailDto dto, String value) { dto.setEmail(value); return dto; }
    private MonthlyAttendanceEmailDto setMonthKey(MonthlyAttendanceEmailDto dto, String value) { dto.setMonthKey(value); return dto; }
    private MonthlyAttendanceEmailDto setWorkDays(MonthlyAttendanceEmailDto dto, BigDecimal value) { dto.setWorkDays(value); return dto; }
    private MonthlyAttendanceEmailDto setLeaveDays(MonthlyAttendanceEmailDto dto, BigDecimal value) { dto.setLeaveDays(value); return dto; }
    private MonthlyAttendanceEmailDto setAbsentDays(MonthlyAttendanceEmailDto dto, BigDecimal value) { dto.setAbsentDays(value); return dto; }
    private MonthlyAttendanceEmailDto setLateMinutes(MonthlyAttendanceEmailDto dto, Integer value) { dto.setLateMinutes(value); return dto; }
    private MonthlyAttendanceEmailDto setOtMinutes(MonthlyAttendanceEmailDto dto, Integer value) { dto.setOtMinutes(value); return dto; }

    private static final class NonEqualMonthlyAttendanceEmailDto extends MonthlyAttendanceEmailDto {
        private NonEqualMonthlyAttendanceEmailDto(MonthlyAttendanceEmailDto base) {
            setEmployeeId(base.getEmployeeId());
            setEmployeeCode(base.getEmployeeCode());
            setEmployeeName(base.getEmployeeName());
            setEmail(base.getEmail());
            setMonthKey(base.getMonthKey());
            setWorkDays(base.getWorkDays());
            setLeaveDays(base.getLeaveDays());
            setAbsentDays(base.getAbsentDays());
            setLateMinutes(base.getLateMinutes());
            setOtMinutes(base.getOtMinutes());
        }

        @Override
        protected boolean canEqual(Object other) {
            return false;
        }
    }
}
