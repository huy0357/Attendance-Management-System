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
            if (Boolean.TRUE.equals(updated.isRequestApplied())) return updated;
        }
        return result;
    }

    private AttendanceCalculationResult applyOne(AttendanceCalculationResult r, Requests req) {
        RequestType type = req.getRequestType();
        if (type == null) return r;

        return switch (type) {
            case LEAVE -> applyLeave(r, req);
            case LATE_EARLY -> applyLateEarly(r, req);
            case OVERTIME -> applyOvertime(r, req);
            case REMOTE -> applyRemote(r, req);
        };
    }

    private AttendanceCalculationResult applyLeave(AttendanceCalculationResult r, Requests req) {
        // Nếu nghỉ phép: ưu tiên biến ABSENT/MISSING_LOG thành ON_LEAVE
        if (r.getStatus() == AttendanceCalcStatus.ABSENT
                || r.getStatus() == AttendanceCalcStatus.MISSING_LOG) {

            return copy(r)
                    .status(AttendanceCalcStatus.ON_LEAVE)
                    .requestApplied(true)
                    .note(appendNote(r.getNote(), "On leave: " + req.getRequestType() + reason(req)))
                    .build();
        }
        return r;
    }

    private AttendanceCalculationResult applyLateEarly(AttendanceCalculationResult r, Requests req) {
        int late = r.getLateMinutes();
        int early = r.getEarlyLeaveMinutes();

        if (r.getStatus() == AttendanceCalcStatus.LATE || r.getStatus() == AttendanceCalcStatus.EARLY_LEAVE) {
            String noteSuffix = r.getStatus() == AttendanceCalcStatus.LATE
                    ? "Late approved" + reason(req)
                    : "Early leave approved" + reason(req);

            late = 0; // Đã duyệt miễn trễ
            early = 0; // Đã duyệt miễn về sớm

            AttendanceCalcStatus newStatus = (late == 0 && early == 0) ? AttendanceCalcStatus.PRESENT : r.getStatus();

            return copy(r)
                    .lateMinutes(late)
                    .earlyLeaveMinutes(early)
                    .status(newStatus)
                    .requestApplied(true)
                    .note(appendNote(r.getNote(), noteSuffix))
                    .build();
        }
        return r;
    }

    private AttendanceCalculationResult applyRemote(AttendanceCalculationResult r, Requests req) {
        if (r.getStatus() == AttendanceCalcStatus.ABSENT
                || r.getStatus() == AttendanceCalcStatus.MISSING_LOG) {

            return copy(r)
                    .status(AttendanceCalcStatus.PRESENT)
                    .requestApplied(true)
                    .note(appendNote(r.getNote(), "Remote work approved" + reason(req)))
                    .build();
        }
        return r;
    }

    private AttendanceCalculationResult applyOvertime(AttendanceCalculationResult r, Requests req) {
        return copy(r)
                .requestApplied(true)
                .note(appendNote(r.getNote(), "OT approved" + reason(req)))
                .build();
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
                .requestApplied(r.isRequestApplied())
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