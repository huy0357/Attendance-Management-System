package org.example.ams_be.dto;

import org.example.ams_be.enums.AttendanceCalcStatus;
import org.example.ams_be.support.LombokPojoBranchAssertions;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.function.UnaryOperator;

class AttendanceCalculationResultTest {

    @Test
    void equalsAndHashCodeCoverGeneratedBranches() {
        LombokPojoBranchAssertions.assertEqualsAndHashCodeBranches(
                this::populated,
                AttendanceCalculationResult::new,
                populatedMismatchMutators(),
                emptyMismatchMutators(),
                dto -> new NonEqualAttendanceCalculationResult(dto)
        );
    }

    private List<UnaryOperator<AttendanceCalculationResult>> populatedMismatchMutators() {
        return List.of(
                dto -> setEmployeeId(dto, 2L),
                dto -> setWorkDate(dto, LocalDate.of(2026, 3, 20)),
                dto -> setShiftId(dto, 20L),
                dto -> setScheduledStartTime(dto, LocalTime.of(9, 0)),
                dto -> setScheduledEndTime(dto, LocalTime.of(18, 0)),
                dto -> setActualCheckIn(dto, LocalDateTime.of(2026, 3, 19, 8, 5)),
                dto -> setActualCheckOut(dto, LocalDateTime.of(2026, 3, 19, 17, 5)),
                dto -> setStatus(dto, AttendanceCalcStatus.ABSENT),
                dto -> setLateMinutes(dto, 10),
                dto -> setEarlyLeaveMinutes(dto, 0),
                dto -> setWorkingHours(dto, 7.5),
                dto -> setIsNightShift(dto, true),
                dto -> setRequestApplied(dto, true),
                dto -> setNote(dto, "Changed")
        );
    }

    private List<UnaryOperator<AttendanceCalculationResult>> emptyMismatchMutators() {
        return List.of(
                dto -> setEmployeeId(dto, 1L),
                dto -> setWorkDate(dto, LocalDate.of(2026, 3, 19)),
                dto -> setShiftId(dto, 10L),
                dto -> setScheduledStartTime(dto, LocalTime.of(8, 0)),
                dto -> setScheduledEndTime(dto, LocalTime.of(17, 0)),
                dto -> setActualCheckIn(dto, LocalDateTime.of(2026, 3, 19, 8, 0)),
                dto -> setActualCheckOut(dto, LocalDateTime.of(2026, 3, 19, 17, 0)),
                dto -> setStatus(dto, AttendanceCalcStatus.PRESENT),
                dto -> setLateMinutes(dto, 5),
                dto -> setEarlyLeaveMinutes(dto, 3),
                dto -> setWorkingHours(dto, 8.0),
                dto -> setIsNightShift(dto, false),
                dto -> setRequestApplied(dto, false),
                dto -> setNote(dto, "Initial")
        );
    }

    private AttendanceCalculationResult populated() {
        return AttendanceCalculationResult.builder()
                .employeeId(1L)
                .workDate(LocalDate.of(2026, 3, 19))
                .shiftId(10L)
                .scheduledStartTime(LocalTime.of(8, 0))
                .scheduledEndTime(LocalTime.of(17, 0))
                .actualCheckIn(LocalDateTime.of(2026, 3, 19, 8, 0))
                .actualCheckOut(LocalDateTime.of(2026, 3, 19, 17, 0))
                .status(AttendanceCalcStatus.PRESENT)
                .lateMinutes(5)
                .earlyLeaveMinutes(3)
                .workingHours(8.0)
                .isNightShift(false)
                .requestApplied(false)
                .note("Initial")
                .build();
    }

    private AttendanceCalculationResult setEmployeeId(AttendanceCalculationResult dto, Long value) { dto.setEmployeeId(value); return dto; }
    private AttendanceCalculationResult setWorkDate(AttendanceCalculationResult dto, LocalDate value) { dto.setWorkDate(value); return dto; }
    private AttendanceCalculationResult setShiftId(AttendanceCalculationResult dto, Long value) { dto.setShiftId(value); return dto; }
    private AttendanceCalculationResult setScheduledStartTime(AttendanceCalculationResult dto, LocalTime value) { dto.setScheduledStartTime(value); return dto; }
    private AttendanceCalculationResult setScheduledEndTime(AttendanceCalculationResult dto, LocalTime value) { dto.setScheduledEndTime(value); return dto; }
    private AttendanceCalculationResult setActualCheckIn(AttendanceCalculationResult dto, LocalDateTime value) { dto.setActualCheckIn(value); return dto; }
    private AttendanceCalculationResult setActualCheckOut(AttendanceCalculationResult dto, LocalDateTime value) { dto.setActualCheckOut(value); return dto; }
    private AttendanceCalculationResult setStatus(AttendanceCalculationResult dto, AttendanceCalcStatus value) { dto.setStatus(value); return dto; }
    private AttendanceCalculationResult setLateMinutes(AttendanceCalculationResult dto, Integer value) { dto.setLateMinutes(value); return dto; }
    private AttendanceCalculationResult setEarlyLeaveMinutes(AttendanceCalculationResult dto, Integer value) { dto.setEarlyLeaveMinutes(value); return dto; }
    private AttendanceCalculationResult setWorkingHours(AttendanceCalculationResult dto, Double value) { dto.setWorkingHours(value); return dto; }
    private AttendanceCalculationResult setIsNightShift(AttendanceCalculationResult dto, Boolean value) { dto.setIsNightShift(value); return dto; }
    private AttendanceCalculationResult setRequestApplied(AttendanceCalculationResult dto, Boolean value) { dto.setRequestApplied(value); return dto; }
    private AttendanceCalculationResult setNote(AttendanceCalculationResult dto, String value) { dto.setNote(value); return dto; }

    private static final class NonEqualAttendanceCalculationResult extends AttendanceCalculationResult {
        private NonEqualAttendanceCalculationResult(AttendanceCalculationResult base) {
            setEmployeeId(base.getEmployeeId());
            setWorkDate(base.getWorkDate());
            setShiftId(base.getShiftId());
            setScheduledStartTime(base.getScheduledStartTime());
            setScheduledEndTime(base.getScheduledEndTime());
            setActualCheckIn(base.getActualCheckIn());
            setActualCheckOut(base.getActualCheckOut());
            setStatus(base.getStatus());
            setLateMinutes(base.getLateMinutes());
            setEarlyLeaveMinutes(base.getEarlyLeaveMinutes());
            setWorkingHours(base.getWorkingHours());
            setIsNightShift(base.getIsNightShift());
            setRequestApplied(base.isRequestApplied());
            setNote(base.getNote());
        }

        @Override
        protected boolean canEqual(Object other) {
            return false;
        }
    }
}
