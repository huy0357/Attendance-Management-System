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
                dto -> setIsNightShift(dto, true),
                dto -> setActualCheckIn(dto, LocalDateTime.of(2026, 3, 19, 8, 5)),
                dto -> setActualCheckOut(dto, LocalDateTime.of(2026, 3, 19, 17, 5)),
                dto -> setStatus(dto, AttendanceCalcStatus.ABSENT),
                dto -> setNote(dto, "Changed"),
                dto -> setLateMinutes(dto, 10),
                dto -> setEarlyLeaveMinutes(dto, 0),
                dto -> setWorkingHours(dto, 7.5),
                dto -> setBreakMinutesApplied(dto, 30),
                dto -> setOtMinutesBefore(dto, 15),
                dto -> setOtMinutesAfter(dto, 45),
                dto -> setOtMinutesHoliday(dto, 60),
                dto -> setConsumedEventIds(dto, List.of(100L, 101L)),
                dto -> setRequestApplied(dto, false)
        );
    }

    private List<UnaryOperator<AttendanceCalculationResult>> emptyMismatchMutators() {
        return List.of(
                dto -> setEmployeeId(dto, 1L),
                dto -> setWorkDate(dto, LocalDate.of(2026, 3, 19)),
                dto -> setShiftId(dto, 10L),
                dto -> setScheduledStartTime(dto, LocalTime.of(8, 0)),
                dto -> setScheduledEndTime(dto, LocalTime.of(17, 0)),
                dto -> setIsNightShift(dto, false),
                dto -> setActualCheckIn(dto, LocalDateTime.of(2026, 3, 19, 8, 0)),
                dto -> setActualCheckOut(dto, LocalDateTime.of(2026, 3, 19, 17, 0)),
                dto -> setStatus(dto, AttendanceCalcStatus.PRESENT),
                dto -> setNote(dto, "Initial"),
                dto -> setLateMinutes(dto, 5),
                dto -> setEarlyLeaveMinutes(dto, 3),
                dto -> setWorkingHours(dto, 8.0),
                dto -> setBreakMinutesApplied(dto, 60),
                dto -> setOtMinutesBefore(dto, 0),
                dto -> setOtMinutesAfter(dto, 0),
                dto -> setOtMinutesHoliday(dto, 0),
                dto -> setConsumedEventIds(dto, List.of(1L)),
                dto -> setRequestApplied(dto, true)
        );
    }

    private AttendanceCalculationResult populated() {
        return AttendanceCalculationResult.builder()
                .employeeId(1L)
                .workDate(LocalDate.of(2026, 3, 19))
                .shiftId(10L)
                .scheduledStartTime(LocalTime.of(8, 0))
                .scheduledEndTime(LocalTime.of(17, 0))
                .isNightShift(false)
                .actualCheckIn(LocalDateTime.of(2026, 3, 19, 8, 0))
                .actualCheckOut(LocalDateTime.of(2026, 3, 19, 17, 0))
                .status(AttendanceCalcStatus.PRESENT)
                .note("Initial")
                .lateMinutes(5)
                .earlyLeaveMinutes(3)
                .workingHours(8.0)
                .breakMinutesApplied(60)
                .otMinutesBefore(0)
                .otMinutesAfter(0)
                .otMinutesHoliday(0)
                .consumedEventIds(List.of(1L))
                .requestApplied(true)
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
    private AttendanceCalculationResult setBreakMinutesApplied(AttendanceCalculationResult dto, Integer value) { dto.setBreakMinutesApplied(value); return dto; }
    private AttendanceCalculationResult setOtMinutesBefore(AttendanceCalculationResult dto, Integer value) { dto.setOtMinutesBefore(value); return dto; }
    private AttendanceCalculationResult setOtMinutesAfter(AttendanceCalculationResult dto, Integer value) { dto.setOtMinutesAfter(value); return dto; }
    private AttendanceCalculationResult setOtMinutesHoliday(AttendanceCalculationResult dto, Integer value) { dto.setOtMinutesHoliday(value); return dto; }
    private AttendanceCalculationResult setConsumedEventIds(AttendanceCalculationResult dto, List<Long> value) { dto.setConsumedEventIds(value); return dto; }

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
            setBreakMinutesApplied(base.getBreakMinutesApplied());
            setOtMinutesBefore(base.getOtMinutesBefore());
            setOtMinutesAfter(base.getOtMinutesAfter());
            setOtMinutesHoliday(base.getOtMinutesHoliday());
            setConsumedEventIds(base.getConsumedEventIds());
        }

        @Override
        protected boolean canEqual(Object other) {
            return false;
        }
    }
}
