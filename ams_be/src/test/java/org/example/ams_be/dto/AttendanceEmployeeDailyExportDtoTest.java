package org.example.ams_be.dto;

import org.example.ams_be.support.LombokPojoBranchAssertions;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.function.UnaryOperator;

class AttendanceEmployeeDailyExportDtoTest {

    @Test
    void equalsAndHashCodeCoverGeneratedBranches() {
        LombokPojoBranchAssertions.assertEqualsAndHashCodeBranches(
                this::populated,
                AttendanceEmployeeDailyExportDto::new,
                populatedMismatchMutators(),
                emptyMismatchMutators(),
                dto -> new NonEqualAttendanceEmployeeDailyExportDto(dto)
        );
    }

    private List<UnaryOperator<AttendanceEmployeeDailyExportDto>> populatedMismatchMutators() {
        return List.of(
                dto -> setEmployeeId(dto, 2L),
                dto -> setEmployeeCode(dto, "EMP-2"),
                dto -> setFullName(dto, "Bob"),
                dto -> setEmail(dto, "bob@company.com"),
                dto -> setWorkDate(dto, LocalDate.of(2026, 3, 20)),
                dto -> setShiftId(dto, 20L),
                dto -> setFirstInTime(dto, LocalDateTime.of(2026, 3, 19, 8, 5)),
                dto -> setLastOutTime(dto, LocalDateTime.of(2026, 3, 19, 17, 5)),
                dto -> setWorkMinutes(dto, 470),
                dto -> setLateMinutes(dto, 10),
                dto -> setEarlyLeaveMinutes(dto, 0),
                dto -> setBreakMinutes(dto, 45),
                dto -> setOtMinutesBefore(dto, 0),
                dto -> setOtMinutesAfter(dto, 15),
                dto -> setOtMinutesHoliday(dto, 30),
                dto -> setStatus(dto, "ABSENT")
        );
    }

    private List<UnaryOperator<AttendanceEmployeeDailyExportDto>> emptyMismatchMutators() {
        return List.of(
                dto -> setEmployeeId(dto, 1L),
                dto -> setEmployeeCode(dto, "EMP-1"),
                dto -> setFullName(dto, "Alice"),
                dto -> setEmail(dto, "alice@company.com"),
                dto -> setWorkDate(dto, LocalDate.of(2026, 3, 19)),
                dto -> setShiftId(dto, 10L),
                dto -> setFirstInTime(dto, LocalDateTime.of(2026, 3, 19, 8, 0)),
                dto -> setLastOutTime(dto, LocalDateTime.of(2026, 3, 19, 17, 0)),
                dto -> setWorkMinutes(dto, 480),
                dto -> setLateMinutes(dto, 5),
                dto -> setEarlyLeaveMinutes(dto, 3),
                dto -> setBreakMinutes(dto, 60),
                dto -> setOtMinutesBefore(dto, 10),
                dto -> setOtMinutesAfter(dto, 20),
                dto -> setOtMinutesHoliday(dto, 40),
                dto -> setStatus(dto, "PRESENT")
        );
    }

    private AttendanceEmployeeDailyExportDto populated() {
        return AttendanceEmployeeDailyExportDto.builder()
                .employeeId(1L)
                .employeeCode("EMP-1")
                .fullName("Alice")
                .email("alice@company.com")
                .workDate(LocalDate.of(2026, 3, 19))
                .shiftId(10L)
                .firstInTime(LocalDateTime.of(2026, 3, 19, 8, 0))
                .lastOutTime(LocalDateTime.of(2026, 3, 19, 17, 0))
                .workMinutes(480)
                .lateMinutes(5)
                .earlyLeaveMinutes(3)
                .breakMinutes(60)
                .otMinutesBefore(10)
                .otMinutesAfter(20)
                .otMinutesHoliday(40)
                .status("PRESENT")
                .build();
    }

    private AttendanceEmployeeDailyExportDto setEmployeeId(AttendanceEmployeeDailyExportDto dto, Long value) { dto.setEmployeeId(value); return dto; }
    private AttendanceEmployeeDailyExportDto setEmployeeCode(AttendanceEmployeeDailyExportDto dto, String value) { dto.setEmployeeCode(value); return dto; }
    private AttendanceEmployeeDailyExportDto setFullName(AttendanceEmployeeDailyExportDto dto, String value) { dto.setFullName(value); return dto; }
    private AttendanceEmployeeDailyExportDto setEmail(AttendanceEmployeeDailyExportDto dto, String value) { dto.setEmail(value); return dto; }
    private AttendanceEmployeeDailyExportDto setWorkDate(AttendanceEmployeeDailyExportDto dto, LocalDate value) { dto.setWorkDate(value); return dto; }
    private AttendanceEmployeeDailyExportDto setShiftId(AttendanceEmployeeDailyExportDto dto, Long value) { dto.setShiftId(value); return dto; }
    private AttendanceEmployeeDailyExportDto setFirstInTime(AttendanceEmployeeDailyExportDto dto, LocalDateTime value) { dto.setFirstInTime(value); return dto; }
    private AttendanceEmployeeDailyExportDto setLastOutTime(AttendanceEmployeeDailyExportDto dto, LocalDateTime value) { dto.setLastOutTime(value); return dto; }
    private AttendanceEmployeeDailyExportDto setWorkMinutes(AttendanceEmployeeDailyExportDto dto, Integer value) { dto.setWorkMinutes(value); return dto; }
    private AttendanceEmployeeDailyExportDto setLateMinutes(AttendanceEmployeeDailyExportDto dto, Integer value) { dto.setLateMinutes(value); return dto; }
    private AttendanceEmployeeDailyExportDto setEarlyLeaveMinutes(AttendanceEmployeeDailyExportDto dto, Integer value) { dto.setEarlyLeaveMinutes(value); return dto; }
    private AttendanceEmployeeDailyExportDto setBreakMinutes(AttendanceEmployeeDailyExportDto dto, Integer value) { dto.setBreakMinutes(value); return dto; }
    private AttendanceEmployeeDailyExportDto setOtMinutesBefore(AttendanceEmployeeDailyExportDto dto, Integer value) { dto.setOtMinutesBefore(value); return dto; }
    private AttendanceEmployeeDailyExportDto setOtMinutesAfter(AttendanceEmployeeDailyExportDto dto, Integer value) { dto.setOtMinutesAfter(value); return dto; }
    private AttendanceEmployeeDailyExportDto setOtMinutesHoliday(AttendanceEmployeeDailyExportDto dto, Integer value) { dto.setOtMinutesHoliday(value); return dto; }
    private AttendanceEmployeeDailyExportDto setStatus(AttendanceEmployeeDailyExportDto dto, String value) { dto.setStatus(value); return dto; }

    private static final class NonEqualAttendanceEmployeeDailyExportDto extends AttendanceEmployeeDailyExportDto {
        private NonEqualAttendanceEmployeeDailyExportDto(AttendanceEmployeeDailyExportDto base) {
            setEmployeeId(base.getEmployeeId());
            setEmployeeCode(base.getEmployeeCode());
            setFullName(base.getFullName());
            setEmail(base.getEmail());
            setWorkDate(base.getWorkDate());
            setShiftId(base.getShiftId());
            setFirstInTime(base.getFirstInTime());
            setLastOutTime(base.getLastOutTime());
            setWorkMinutes(base.getWorkMinutes());
            setLateMinutes(base.getLateMinutes());
            setEarlyLeaveMinutes(base.getEarlyLeaveMinutes());
            setBreakMinutes(base.getBreakMinutes());
            setOtMinutesBefore(base.getOtMinutesBefore());
            setOtMinutesAfter(base.getOtMinutesAfter());
            setOtMinutesHoliday(base.getOtMinutesHoliday());
            setStatus(base.getStatus());
        }

        @Override
        protected boolean canEqual(Object other) {
            return false;
        }
    }
}
