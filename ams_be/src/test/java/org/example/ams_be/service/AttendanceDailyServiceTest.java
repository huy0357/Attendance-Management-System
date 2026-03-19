package org.example.ams_be.service;

import org.example.ams_be.dto.response.AttendanceDailyResponse;
import org.example.ams_be.entity.AttendanceDaily;
import org.example.ams_be.repository.AttendanceDailyRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceDailyServiceTest {

    @Mock
    private AttendanceDailyRepository attendanceDailyRepository;

    @InjectMocks
    private AttendanceDailyService attendanceDailyService;

    @Test
    void adminGetAttendanceMapsRepositoryPageToResponse() {
        LocalDate from = LocalDate.of(2026, 3, 1);
        LocalDate to = LocalDate.of(2026, 3, 31);
        Pageable pageable = PageRequest.of(0, 10);
        AttendanceDaily attendance = buildAttendanceDaily(10L, 100L);

        when(attendanceDailyRepository.findByWorkDateBetween(from, to, pageable))
                .thenReturn(new PageImpl<>(List.of(attendance), pageable, 1));

        Page<AttendanceDailyResponse> result = attendanceDailyService.adminGetAttendance(from, to, pageable);

        assertEquals(1, result.getTotalElements());
        assertAttendanceMapped(result.getContent().get(0), attendance);
        verify(attendanceDailyRepository).findByWorkDateBetween(from, to, pageable);
    }

    @Test
    void employeeGetAttendanceMapsRepositoryPageToResponse() {
        Long employeeId = 100L;
        LocalDate from = LocalDate.of(2026, 3, 1);
        LocalDate to = LocalDate.of(2026, 3, 31);
        Pageable pageable = PageRequest.of(0, 5);
        AttendanceDaily attendance = buildAttendanceDaily(11L, employeeId);

        when(attendanceDailyRepository.findByEmployeeIdAndWorkDateBetween(employeeId, from, to, pageable))
                .thenReturn(new PageImpl<>(List.of(attendance), pageable, 1));

        Page<AttendanceDailyResponse> result = attendanceDailyService.employeeGetAttendance(employeeId, from, to, pageable);

        assertEquals(1, result.getTotalElements());
        assertAttendanceMapped(result.getContent().get(0), attendance);
        verify(attendanceDailyRepository).findByEmployeeIdAndWorkDateBetween(employeeId, from, to, pageable);
    }

    private AttendanceDaily buildAttendanceDaily(Long attendanceId, Long employeeId) {
        return AttendanceDaily.builder()
                .attendanceId(attendanceId)
                .employeeId(employeeId)
                .workDate(LocalDate.of(2026, 3, 18))
                .shiftId(5L)
                .firstInTime(LocalDateTime.of(2026, 3, 18, 8, 0))
                .lastOutTime(LocalDateTime.of(2026, 3, 18, 17, 0))
                .workMinutes(480)
                .lateMinutes(5)
                .earlyLeaveMinutes(0)
                .breakMinutes(60)
                .otMinutesBefore(15)
                .otMinutesAfter(30)
                .otMinutesHoliday(0)
                .status(AttendanceDaily.AttendanceStatus.PRESENT)
                .calculatedAt(LocalDateTime.of(2026, 3, 18, 17, 10))
                .updatedAt(LocalDateTime.of(2026, 3, 18, 17, 15))
                .build();
    }

    private void assertAttendanceMapped(AttendanceDailyResponse response, AttendanceDaily attendance) {
        assertEquals(attendance.getAttendanceId(), response.getAttendanceId());
        assertEquals(attendance.getEmployeeId(), response.getEmployeeId());
        assertEquals(attendance.getWorkDate(), response.getWorkDate());
        assertEquals(attendance.getShiftId(), response.getShiftId());
        assertEquals(attendance.getFirstInTime(), response.getFirstInTime());
        assertEquals(attendance.getLastOutTime(), response.getLastOutTime());
        assertEquals(attendance.getWorkMinutes(), response.getWorkMinutes());
        assertEquals(attendance.getLateMinutes(), response.getLateMinutes());
        assertEquals(attendance.getEarlyLeaveMinutes(), response.getEarlyLeaveMinutes());
        assertEquals(attendance.getBreakMinutes(), response.getBreakMinutes());
        assertEquals(attendance.getOtMinutesBefore(), response.getOtMinutesBefore());
        assertEquals(attendance.getOtMinutesAfter(), response.getOtMinutesAfter());
        assertEquals(attendance.getOtMinutesHoliday(), response.getOtMinutesHoliday());
        assertEquals(attendance.getStatus(), response.getStatus());
        assertEquals(attendance.getCalculatedAt(), response.getCalculatedAt());
        assertEquals(attendance.getUpdatedAt(), response.getUpdatedAt());
    }
}
