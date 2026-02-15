package org.example.ams_be.dto.response;

import org.example.ams_be.entity.EmployeeSchedule.ScheduleSource;

import java.time.LocalDate;
import java.time.LocalTime;

public class EmployeeScheduleDayResponse {

    private Long scheduleId;
    private Long employeeId;
    private LocalDate workDate;

    private Long shiftId;
    private String shiftCode;
    private String shiftName;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer breakMinutes;
    private Boolean isNightShift;

    private ScheduleSource scheduleSource;
    private String note;

    // ✅ CONSTRUCTOR BẮT BUỘC PHẢI GIỐNG JPQL 100%
    public EmployeeScheduleDayResponse(
            Long scheduleId,
            Long employeeId,
            LocalDate workDate,
            Long shiftId,
            String shiftCode,
            String shiftName,
            LocalTime startTime,
            LocalTime endTime,
            Integer breakMinutes,
            Boolean isNightShift,
            ScheduleSource scheduleSource,
            String note
    ) {
        this.scheduleId = scheduleId;
        this.employeeId = employeeId;
        this.workDate = workDate;
        this.shiftId = shiftId;
        this.shiftCode = shiftCode;
        this.shiftName = shiftName;
        this.startTime = startTime;
        this.endTime = endTime;
        this.breakMinutes = breakMinutes;
        this.isNightShift = isNightShift;
        this.scheduleSource = scheduleSource;
        this.note = note;
    }

    // Getter (bắt buộc cho Jackson serialize)
    public Long getScheduleId() { return scheduleId; }
    public Long getEmployeeId() { return employeeId; }
    public LocalDate getWorkDate() { return workDate; }
    public Long getShiftId() { return shiftId; }
    public String getShiftCode() { return shiftCode; }
    public String getShiftName() { return shiftName; }
    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime() { return endTime; }
    public Integer getBreakMinutes() { return breakMinutes; }
    public Boolean getIsNightShift() { return isNightShift; }
    public ScheduleSource getScheduleSource() { return scheduleSource; }
    public String getNote() { return note; }
}
