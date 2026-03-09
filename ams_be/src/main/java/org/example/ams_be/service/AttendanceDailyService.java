package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.response.AttendanceDailyResponse;
import org.example.ams_be.entity.AttendanceDaily;
import org.example.ams_be.repository.AttendanceDailyRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class AttendanceDailyService {

    private final AttendanceDailyRepository attendanceDailyRepository;

    // ADMIN: xem tổng theo khoảng ngày
    public Page<AttendanceDailyResponse> adminGetAttendance(LocalDate from, LocalDate to, Pageable pageable) {
        return attendanceDailyRepository.findByWorkDateBetween(from, to, pageable)
                .map(this::toResponse);
    }

    // EMPLOYEE: xem theo employeeId
    public Page<AttendanceDailyResponse> employeeGetAttendance(Long employeeId, LocalDate from, LocalDate to, Pageable pageable) {
        return attendanceDailyRepository.findByEmployeeIdAndWorkDateBetween(employeeId, from, to, pageable)
                .map(this::toResponse);
    }

    private AttendanceDailyResponse toResponse(AttendanceDaily a) {
        return AttendanceDailyResponse.builder()
                .attendanceId(a.getAttendanceId())
                .employeeId(a.getEmployeeId())
                .workDate(a.getWorkDate())
                .shiftId(a.getShiftId())

                .firstInTime(a.getFirstInTime())
                .lastOutTime(a.getLastOutTime())

                .workMinutes(a.getWorkMinutes())
                .lateMinutes(a.getLateMinutes())
                .earlyLeaveMinutes(a.getEarlyLeaveMinutes())

                .breakMinutes(a.getBreakMinutes())
                .otMinutesBefore(a.getOtMinutesBefore())
                .otMinutesAfter(a.getOtMinutesAfter())
                .otMinutesHoliday(a.getOtMinutesHoliday())

                .status(a.getStatus())

                .calculatedAt(a.getCalculatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}