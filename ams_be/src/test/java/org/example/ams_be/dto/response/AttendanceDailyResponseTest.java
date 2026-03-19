package org.example.ams_be.dto.response;

import org.example.ams_be.entity.AttendanceDaily;
import org.example.ams_be.support.LombokPojoBranchAssertions;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.function.UnaryOperator;

class AttendanceDailyResponseTest {

    @Test
    void equalsAndHashCodeCoverGeneratedBranches() {
        LombokPojoBranchAssertions.assertEqualsAndHashCodeBranches(
                this::populated,
                this::empty,
                populatedMismatchMutators(),
                emptyMismatchMutators(),
                dto -> new NonEqualAttendanceDailyResponse(dto)
        );
    }

    private List<UnaryOperator<AttendanceDailyResponse>> populatedMismatchMutators() {
        return List.of(
                dto -> setAttendanceId(dto, 2L),
                dto -> setEmployeeId(dto, 3L),
                dto -> setWorkDate(dto, LocalDate.of(2026, 3, 20)),
                dto -> setShiftId(dto, 20L),
                dto -> setFirstInTime(dto, LocalDateTime.of(2026, 3, 19, 8, 5)),
                dto -> setLastOutTime(dto, LocalDateTime.of(2026, 3, 19, 17, 5)),
                dto -> setWorkMinutes(dto, 470),
                dto -> setLateMinutes(dto, 10),
                dto -> setEarlyLeaveMinutes(dto, 0),
                dto -> setBreakMinutes(dto, 45),
                dto -> setOtMinutesBefore(dto, 0),
                dto -> setOtMinutesAfter(dto, 10),
                dto -> setOtMinutesHoliday(dto, 20),
                dto -> setStatus(dto, AttendanceDaily.AttendanceStatus.ABSENT),
                dto -> setCalculatedAt(dto, LocalDateTime.of(2026, 3, 19, 18, 0)),
                dto -> setUpdatedAt(dto, LocalDateTime.of(2026, 3, 19, 18, 30))
        );
    }

    private List<UnaryOperator<AttendanceDailyResponse>> emptyMismatchMutators() {
        return List.of(
                dto -> setAttendanceId(dto, 1L),
                dto -> setEmployeeId(dto, 2L),
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
                dto -> setStatus(dto, AttendanceDaily.AttendanceStatus.PRESENT),
                dto -> setCalculatedAt(dto, LocalDateTime.of(2026, 3, 19, 17, 30)),
                dto -> setUpdatedAt(dto, LocalDateTime.of(2026, 3, 19, 17, 45))
        );
    }

    private AttendanceDailyResponse populated() {
        return AttendanceDailyResponse.builder()
                .attendanceId(1L)
                .employeeId(2L)
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
                .status(AttendanceDaily.AttendanceStatus.PRESENT)
                .calculatedAt(LocalDateTime.of(2026, 3, 19, 17, 30))
                .updatedAt(LocalDateTime.of(2026, 3, 19, 17, 45))
                .build();
    }

    private AttendanceDailyResponse empty() {
        return AttendanceDailyResponse.builder().build();
    }

    private AttendanceDailyResponse setAttendanceId(AttendanceDailyResponse dto, Long value) { dto.setAttendanceId(value); return dto; }
    private AttendanceDailyResponse setEmployeeId(AttendanceDailyResponse dto, Long value) { dto.setEmployeeId(value); return dto; }
    private AttendanceDailyResponse setWorkDate(AttendanceDailyResponse dto, LocalDate value) { dto.setWorkDate(value); return dto; }
    private AttendanceDailyResponse setShiftId(AttendanceDailyResponse dto, Long value) { dto.setShiftId(value); return dto; }
    private AttendanceDailyResponse setFirstInTime(AttendanceDailyResponse dto, LocalDateTime value) { dto.setFirstInTime(value); return dto; }
    private AttendanceDailyResponse setLastOutTime(AttendanceDailyResponse dto, LocalDateTime value) { dto.setLastOutTime(value); return dto; }
    private AttendanceDailyResponse setWorkMinutes(AttendanceDailyResponse dto, Integer value) { dto.setWorkMinutes(value); return dto; }
    private AttendanceDailyResponse setLateMinutes(AttendanceDailyResponse dto, Integer value) { dto.setLateMinutes(value); return dto; }
    private AttendanceDailyResponse setEarlyLeaveMinutes(AttendanceDailyResponse dto, Integer value) { dto.setEarlyLeaveMinutes(value); return dto; }
    private AttendanceDailyResponse setBreakMinutes(AttendanceDailyResponse dto, Integer value) { dto.setBreakMinutes(value); return dto; }
    private AttendanceDailyResponse setOtMinutesBefore(AttendanceDailyResponse dto, Integer value) { dto.setOtMinutesBefore(value); return dto; }
    private AttendanceDailyResponse setOtMinutesAfter(AttendanceDailyResponse dto, Integer value) { dto.setOtMinutesAfter(value); return dto; }
    private AttendanceDailyResponse setOtMinutesHoliday(AttendanceDailyResponse dto, Integer value) { dto.setOtMinutesHoliday(value); return dto; }
    private AttendanceDailyResponse setStatus(AttendanceDailyResponse dto, AttendanceDaily.AttendanceStatus value) { dto.setStatus(value); return dto; }
    private AttendanceDailyResponse setCalculatedAt(AttendanceDailyResponse dto, LocalDateTime value) { dto.setCalculatedAt(value); return dto; }
    private AttendanceDailyResponse setUpdatedAt(AttendanceDailyResponse dto, LocalDateTime value) { dto.setUpdatedAt(value); return dto; }

    private static final class NonEqualAttendanceDailyResponse extends AttendanceDailyResponse {
        private NonEqualAttendanceDailyResponse(AttendanceDailyResponse base) {
            super(
                    base.getAttendanceId(),
                    base.getEmployeeId(),
                    base.getWorkDate(),
                    base.getShiftId(),
                    base.getFirstInTime(),
                    base.getLastOutTime(),
                    base.getWorkMinutes(),
                    base.getLateMinutes(),
                    base.getEarlyLeaveMinutes(),
                    base.getBreakMinutes(),
                    base.getOtMinutesBefore(),
                    base.getOtMinutesAfter(),
                    base.getOtMinutesHoliday(),
                    base.getStatus(),
                    base.getCalculatedAt(),
                    base.getUpdatedAt()
            );
        }

        @Override
        protected boolean canEqual(Object other) {
            return false;
        }
    }
}
