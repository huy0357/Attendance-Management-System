package org.example.ams_be.repository;

import org.example.ams_be.dto.MonthlyAttendanceEmailDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class AttendanceSummaryMonthlyRepository {

    private final JdbcTemplate jdbcTemplate;

    public AttendanceSummaryMonthlyRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public int upsertByMonth(String monthKey) {
        String sql = """
            INSERT INTO attendance_summary_monthly (
                month_key,
                employee_id,
                department_id,
                work_days,
                leave_days,
                ot_minutes,
                late_minutes,
                early_leave_minutes,
                absent_days,
                generated_at
            )
            SELECT
                DATE_FORMAT(ad.work_date, '%Y-%m') AS month_key,
                ad.employee_id,
                e.department_id,
                SUM(CASE WHEN ad.status = 'PRESENT' THEN 1 ELSE 0 END) AS work_days,
                SUM(CASE WHEN ad.status = 'LEAVE' THEN 1 ELSE 0 END) AS leave_days,
                SUM(
                    COALESCE(ad.ot_minutes_before, 0) +
                    COALESCE(ad.ot_minutes_after, 0) +
                    COALESCE(ad.ot_minutes_holiday, 0)
                ) AS ot_minutes,
                SUM(COALESCE(ad.late_minutes, 0)) AS late_minutes,
                SUM(COALESCE(ad.early_leave_minutes, 0)) AS early_leave_minutes,
                SUM(CASE WHEN ad.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_days,
                NOW() AS generated_at
            FROM attendance_daily ad
            JOIN employees e ON e.employee_id = ad.employee_id
            WHERE DATE_FORMAT(ad.work_date, '%Y-%m') = ?
            GROUP BY DATE_FORMAT(ad.work_date, '%Y-%m'), ad.employee_id, e.department_id
            ON DUPLICATE KEY UPDATE
                department_id = VALUES(department_id),
                work_days = VALUES(work_days),
                leave_days = VALUES(leave_days),
                ot_minutes = VALUES(ot_minutes),
                late_minutes = VALUES(late_minutes),
                early_leave_minutes = VALUES(early_leave_minutes),
                absent_days = VALUES(absent_days),
                generated_at = VALUES(generated_at)
            """;

        return jdbcTemplate.update(sql, monthKey);
    }

    public int upsertByMonthAndEmployee(String monthKey, Long employeeId) {
        String sql = """
            INSERT INTO attendance_summary_monthly (
                month_key,
                employee_id,
                department_id,
                work_days,
                leave_days,
                ot_minutes,
                late_minutes,
                early_leave_minutes,
                absent_days,
                generated_at
            )
            SELECT
                DATE_FORMAT(ad.work_date, '%Y-%m') AS month_key,
                ad.employee_id,
                e.department_id,
                SUM(CASE WHEN ad.status = 'PRESENT' THEN 1 ELSE 0 END) AS work_days,
                SUM(CASE WHEN ad.status = 'LEAVE' THEN 1 ELSE 0 END) AS leave_days,
                SUM(
                    COALESCE(ad.ot_minutes_before, 0) +
                    COALESCE(ad.ot_minutes_after, 0) +
                    COALESCE(ad.ot_minutes_holiday, 0)
                ) AS ot_minutes,
                SUM(COALESCE(ad.late_minutes, 0)) AS late_minutes,
                SUM(COALESCE(ad.early_leave_minutes, 0)) AS early_leave_minutes,
                SUM(CASE WHEN ad.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_days,
                NOW() AS generated_at
            FROM attendance_daily ad
            JOIN employees e ON e.employee_id = ad.employee_id
            WHERE DATE_FORMAT(ad.work_date, '%Y-%m') = ?
              AND ad.employee_id = ?
            GROUP BY DATE_FORMAT(ad.work_date, '%Y-%m'), ad.employee_id, e.department_id
            ON DUPLICATE KEY UPDATE
                department_id = VALUES(department_id),
                work_days = VALUES(work_days),
                leave_days = VALUES(leave_days),
                ot_minutes = VALUES(ot_minutes),
                late_minutes = VALUES(late_minutes),
                early_leave_minutes = VALUES(early_leave_minutes),
                absent_days = VALUES(absent_days),
                generated_at = VALUES(generated_at)
            """;

        return jdbcTemplate.update(sql, monthKey, employeeId);
    }

    public Optional<MonthlyAttendanceEmailDto> findEmailSummaryByMonthAndEmployee(String monthKey, Long employeeId) {
        String sql = """
            SELECT
                m.employee_id,
                e.employee_code,
                e.full_name,
                e.email,
                m.month_key,
                m.work_days,
                m.leave_days,
                m.absent_days,
                m.late_minutes,
                m.early_leave_minutes,
                m.ot_minutes
            FROM attendance_summary_monthly m
            JOIN employees e ON e.employee_id = m.employee_id
            WHERE m.month_key = ?
              AND m.employee_id = ?
            """;

        List<MonthlyAttendanceEmailDto> list = jdbcTemplate.query(sql, (rs, rowNum) ->
                        MonthlyAttendanceEmailDto.builder()
                                .employeeId(rs.getLong("employee_id"))
                                .employeeCode(rs.getString("employee_code"))
                                .employeeName(rs.getString("full_name"))
                                .email(rs.getString("email"))
                                .monthKey(rs.getString("month_key"))
                                .workDays(rs.getBigDecimal("work_days"))
                                .leaveDays(rs.getBigDecimal("leave_days"))
                                .absentDays(rs.getBigDecimal("absent_days"))
                                .lateMinutes(rs.getInt("late_minutes"))
                                .earlyLeaveMinutes(rs.getInt("early_leave_minutes"))
                                .otMinutes(rs.getInt("ot_minutes"))
                                .build()
                , monthKey, employeeId);

        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public List<MonthlyAttendanceEmailDto> findAllEmailSummaryByMonth(String monthKey) {
        String sql = """
            SELECT
                m.employee_id,
                e.employee_code,
                e.full_name,
                e.email,
                m.month_key,
                m.work_days,
                m.leave_days,
                m.absent_days,
                m.late_minutes,
                m.early_leave_minutes,
                m.ot_minutes
            FROM attendance_summary_monthly m
            JOIN employees e ON e.employee_id = m.employee_id
            WHERE m.month_key = ?
              AND e.email IS NOT NULL
              AND TRIM(e.email) <> ''
            ORDER BY m.employee_id
            """;

        return jdbcTemplate.query(sql, (rs, rowNum) ->
                        MonthlyAttendanceEmailDto.builder()
                                .employeeId(rs.getLong("employee_id"))
                                .employeeCode(rs.getString("employee_code"))
                                .employeeName(rs.getString("full_name"))
                                .email(rs.getString("email"))
                                .monthKey(rs.getString("month_key"))
                                .workDays(rs.getBigDecimal("work_days"))
                                .leaveDays(rs.getBigDecimal("leave_days"))
                                .absentDays(rs.getBigDecimal("absent_days"))
                                .lateMinutes(rs.getInt("late_minutes"))
                                .earlyLeaveMinutes(rs.getInt("early_leave_minutes"))
                                .otMinutes(rs.getInt("ot_minutes"))
                                .build()
                , monthKey);
    }
}