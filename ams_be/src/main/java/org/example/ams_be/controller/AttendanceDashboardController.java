
package org.example.ams_be.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ams_be.dto.response.ApiResponse;
import org.example.ams_be.dto.response.DashboardKpiResponse;
import org.example.ams_be.dto.response.ExceptionsResponse;
import org.example.ams_be.dto.response.LivePulseResponse;
import org.example.ams_be.enums.ExceptionSeverity;
import org.example.ams_be.enums.ExceptionStatus;
import org.example.ams_be.service.AttendanceDashboardService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Slf4j
public class AttendanceDashboardController {

    private final AttendanceDashboardService attendanceDashboardService;

    /**
     * GET /api/v1/dashboard/kpi
     * Lấy tổng quan KPI cho dashboard
     */
    @GetMapping("/kpi")
    public ResponseEntity<ApiResponse<DashboardKpiResponse>> getKpiMetrics(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate date,
            @RequestParam(required = false) List<String> branchIds,
            @RequestParam(defaultValue = "Asia/Ho_Chi_Minh") String timezone) {

        try {
            LocalDate targetDate = date != null ? date : LocalDate.now();
            DashboardKpiResponse kpi = attendanceDashboardService.getKpiMetrics(targetDate, branchIds, timezone);

            return ResponseEntity.ok(ApiResponse.success(kpi, "KPI metrics retrieved successfully"));
        } catch (Exception e) {
            log.error("Error retrieving KPI metrics", e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to retrieve KPI metrics", "KPI_ERROR"));
        }
    }

    /**
     * GET /api/v1/dashboard/live-pulse
     * Lấy danh sách check-in gần đây nhất (real-time)
     */
    @GetMapping("/live-pulse")
    public ResponseEntity<ApiResponse<LivePulseResponse>> getLivePulse(
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) Integer limit,
            @RequestParam(required = false) List<String> branchIds,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since,
            @RequestParam(defaultValue = "false") Boolean includeCheckOut) {

        try {
            LivePulseResponse livePulse = attendanceDashboardService.getLivePulse(
                    limit, branchIds, since, includeCheckOut);

            return ResponseEntity.ok(ApiResponse.success(livePulse, "Live pulse data retrieved successfully"));
        } catch (Exception e) {
            log.error("Error retrieving live pulse data", e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to retrieve live pulse data", "LIVE_PULSE_ERROR"));
        }
    }

    /**
     * GET /api/v1/dashboard/exceptions
     * Lấy danh sách ngoại lệ cần xử lý
     */
    @GetMapping("/exceptions")
    public ResponseEntity<ApiResponse<ExceptionsResponse>> getExceptions(
            @RequestParam(required = false) List<ExceptionStatus> status,
            @RequestParam(required = false) List<ExceptionSeverity> severity,
            @RequestParam(required = false) List<String> branchIds,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) Integer limit,
            @RequestParam(defaultValue = "0") @Min(0) Integer offset,
            @RequestParam(defaultValue = "occurrenceTime") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortOrder) {

        try {
            ExceptionsResponse exceptions = attendanceDashboardService.getExceptions(
                    status, severity, branchIds, limit, offset, sortBy, sortOrder);

            return ResponseEntity.ok(ApiResponse.success(exceptions, "Exceptions retrieved successfully"));
        } catch (Exception e) {
            log.error("Error retrieving exceptions", e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to retrieve exceptions", "EXCEPTIONS_ERROR"));
        }
    }

    /**
     * POST /api/v1/dashboard/exceptions/{exceptionId}/resolve
     * Giải quyết ngoại lệ
     */
    @PostMapping("/exceptions/{exceptionId}/resolve")
    public ResponseEntity<ApiResponse<Void>> resolveException(
            @PathVariable Long exceptionId,
            @RequestBody @Valid ResolveExceptionRequest request) {

        try {
            String resolvedBy = getCurrentUsername();
            attendanceDashboardService.resolveException(exceptionId, request.getNotes(), resolvedBy);

            return ResponseEntity.ok(ApiResponse.success(null, "Exception resolved successfully"));
        } catch (Exception e) {
            log.error("Error resolving exception {}", exceptionId, e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to resolve exception", "RESOLVE_ERROR"));
        }
    }

    /**
     * GET /api/v1/dashboard/statistics
     * Lấy thống kê chi tiết (bổ sung)
     */
    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<Object>> getDetailedStatistics(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate toDate,
            @RequestParam(required = false) List<String> branchIds) {

        try {
            // Placeholder cho thống kê chi tiết
            return ResponseEntity.ok(ApiResponse.success(null, "Feature coming soon"));
        } catch (Exception e) {
            log.error("Error retrieving detailed statistics", e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to retrieve statistics", "STATS_ERROR"));
        }
    }

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null ? authentication.getName() : "system";
    }

    // Request DTO cho resolve exception
    public static class ResolveExceptionRequest {
        private String notes;

        public String getNotes() {
            return notes;
        }

        public void setNotes(String notes) {
            this.notes = notes;
        }
    }
}