package org.example.ams_be.repository;

import org.example.ams_be.dto.AttendanceEmployeeDailyExportDto;
import org.example.ams_be.dto.AttendanceMonthlyExportDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public class AttendanceExportRepository {

    private final JdbcTemplate jdbcTemplate;

    public AttendanceExportRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<AttendanceMonthlyExportDto> findMonthlySummaryByMonth(String monthKey) {
        String sql = """
            SELECT
                m.month_key,
                m.employee_id,
                e.employee_code,
                e.full_name,
                e.email,
                m.department_id,
                m.work_days,
                m.leave_days,
                m.absent_days,
                m.late_minutes,
                m.ot_minutes,
                m.generated_at
            FROM attendance_summary_monthly m
            JOIN employees e ON e.employee_id = m.employee_id
            WHERE m.month_key = ?
            ORDER BY e.full_name ASC, m.employee_id ASC
            """;

        return jdbcTemplate.query(sql, (rs, rowNum) ->
                        AttendanceMonthlyExportDto.builder()
                                .monthKey(rs.getString("month_key"))
                                .employeeId(rs.getLong("employee_id"))
                                .employeeCode(rs.getString("employee_code"))
                                .fullName(rs.getString("full_name"))
                                .email(rs.getString("email"))
                                .departmentId(rs.getObject("department_id", Long.class))
                                .workDays(rs.getBigDecimal("work_days"))
                                .leaveDays(rs.getBigDecimal("leave_days"))
                                .absentDays(rs.getBigDecimal("absent_days"))
                                .lateMinutes(rs.getObject("late_minutes", Integer.class))
                                .otMinutes(rs.getObject("ot_minutes", Integer.class))
                                .generatedAt(rs.getObject("generated_at", LocalDateTime.class))
                                .build()
                , monthKey);
    }

    public List<AttendanceEmployeeDailyExportDto> findEmployeeDailyByMonth(String monthKey, Long employeeId) {
        String sql = """
            SELECT
                ad.employee_id,
                e.employee_code,
                e.full_name,
                e.email,
                ad.work_date,
                ad.shift_id,
                ad.first_in_time,
                ad.last_out_time,
                ad.work_minutes,
                ad.late_minutes,
                ad.early_leave_minutes,
                ad.break_minutes,
                ad.ot_minutes_before,
                ad.ot_minutes_after,
                ad.ot_minutes_holiday,
                ad.status
            FROM attendance_daily ad
            JOIN employees e ON e.employee_id = ad.employee_id
            WHERE DATE_FORMAT(ad.work_date, '%Y-%m') = ?
              AND ad.employee_id = ?
            ORDER BY ad.work_date
            """;

        return jdbcTemplate.query(sql, (rs, rowNum) ->
                        AttendanceEmployeeDailyExportDto.builder()
                                .employeeId(rs.getLong("employee_id"))
                                .employeeCode(rs.getString("employee_code"))
                                .fullName(rs.getString("full_name"))
                                .email(rs.getString("email"))
                                .workDate(rs.getObject("work_date", java.time.LocalDate.class))
                                .shiftId(rs.getObject("shift_id", Long.class))
                                .firstInTime(rs.getObject("first_in_time", java.time.LocalDateTime.class))
                                .lastOutTime(rs.getObject("last_out_time", java.time.LocalDateTime.class))
                                .workMinutes(rs.getObject("work_minutes", Integer.class))
                                .lateMinutes(rs.getObject("late_minutes", Integer.class))
                                .earlyLeaveMinutes(rs.getObject("early_leave_minutes", Integer.class))
                                .breakMinutes(rs.getObject("break_minutes", Integer.class))
                                .otMinutesBefore(rs.getObject("ot_minutes_before", Integer.class))
                                .otMinutesAfter(rs.getObject("ot_minutes_after", Integer.class))
                                .otMinutesHoliday(rs.getObject("ot_minutes_holiday", Integer.class))
                                .status(rs.getString("status"))
                                .build()
                , monthKey, employeeId);
    }
}