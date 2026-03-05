package org.example.ams_be.service.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ams_be.dto.AttendanceCalculationResult;
import org.example.ams_be.entity.Requests;
import org.example.ams_be.enums.AttendanceCalcStatus;
import org.example.ams_be.enums.RequestStatus;
import org.example.ams_be.enums.RequestType;
import org.example.ams_be.repository.RequestRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RequestApplicationService {

    private final RequestRepository requestRepository;

    public List<AttendanceCalculationResult> applyRequests(
            List<AttendanceCalculationResult> calculationResults,
            LocalDate processDate
    ) {
        LocalDateTime startOfDay = processDate.atStartOfDay();
        LocalDateTime endOfDay = processDate.plusDays(1).atStartOfDay().minusNanos(1);

        List<Requests> approved = requestRepository.findApprovedRequestsOverlappingDay(
                RequestStatus.APPROVED, startOfDay, endOfDay
        );

        Map<Long, List<Requests>> byEmp = approved.stream()
                .collect(Collectors.groupingBy(this::employeeIdOf));

        return calculationResults.stream()
                .map(r -> applyRequestsToResult(r, byEmp.get(r.getEmployeeId())))
                .collect(Collectors.toList());
    }

    private AttendanceCalculationResult applyRequestsToResult(
            AttendanceCalculationResult result,
            List<Requests> requests
    ) {
        if (requests == null || requests.isEmpty()) return result;

        for (Requests req : requests) {
            AttendanceCalculationResult updated = applyOne(result, req);
            if (Boolean.TRUE.equals(updated.getHasRequestApplied())) return updated;
        }
        return result;
    }

    private AttendanceCalculationResult applyOne(AttendanceCalculationResult r, Requests req) {
        RequestType type = req.getRequestType();
        if (type == null) return r;

        return switch (type) {
            case LEAVE -> applyLeave(r, req);
            case LATE_EARLY -> applyLateEarly(r, req);

            // Các loại khác chưa xử lý trong batch này
            case OVERTIME, REMOTE -> r;
        };
    }

    private AttendanceCalculationResult applyLeave(AttendanceCalculationResult r, Requests req) {
        // Nếu nghỉ phép: ưu tiên biến ABSENT/MISSING_LOG thành ON_LEAVE
        if (r.getStatus() == AttendanceCalcStatus.ABSENT
                || r.getStatus() == AttendanceCalcStatus.MISSING_LOG) {

            return copy(r)
                    .status(AttendanceCalcStatus.ON_LEAVE)
                    .hasRequestApplied(true)
                    .note(appendNote(r.getNote(), "On leave: " + req.getRequestType() + reason(req)))
                    .build();
        }
        return r;
    }

    private AttendanceCalculationResult applyLateEarly(AttendanceCalculationResult r, Requests req) {
        if (r.getStatus() == AttendanceCalcStatus.LATE) {
            return copy(r)
                    .lateMinutes(0)
                    .status(AttendanceCalcStatus.PRESENT)
                    .hasRequestApplied(true)
                    .note(appendNote(r.getNote(), "Late approved" + reason(req)))
                    .build();
        }

        if (r.getStatus() == AttendanceCalcStatus.EARLY_LEAVE) {
            return copy(r)
                    .earlyLeaveMinutes(0)
                    .status(AttendanceCalcStatus.PRESENT)
                    .hasRequestApplied(true)
                    .note(appendNote(r.getNote(), "Early leave approved" + reason(req)))
                    .build();
        }

        return r;
    }

    private AttendanceCalculationResult.AttendanceCalculationResultBuilder copy(AttendanceCalculationResult r) {
        return AttendanceCalculationResult.builder()
                .employeeId(r.getEmployeeId())
                .workDate(r.getWorkDate())
                .shiftId(r.getShiftId())
                .scheduledStartTime(r.getScheduledStartTime())
                .scheduledEndTime(r.getScheduledEndTime())
                .actualCheckIn(r.getActualCheckIn())
                .actualCheckOut(r.getActualCheckOut())
                .status(r.getStatus())
                .lateMinutes(r.getLateMinutes())
                .earlyLeaveMinutes(r.getEarlyLeaveMinutes())
                .workingHours(r.getWorkingHours())
                .isNightShift(r.getIsNightShift())
                .hasRequestApplied(r.getHasRequestApplied())
                .note(r.getNote());
    }

    private String appendNote(String oldNote, String add) {
        if (oldNote == null || oldNote.isBlank()) return add;
        return oldNote.trim() + " | " + add;
    }

    private String reason(Requests req) {
        if (req.getReason() == null || req.getReason().isBlank()) return "";
        return " - " + req.getReason();
    }

    private Long employeeIdOf(Requests req) {
        // Requests.employee là ManyToOne Employee
        // Nếu Employee entity dùng getId() thay vì getEmployeeId() thì đổi tại đây
        return req.getEmployee().getEmployeeId();
    }
}