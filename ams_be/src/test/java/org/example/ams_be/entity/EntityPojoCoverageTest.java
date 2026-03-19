package org.example.ams_be.entity;

import org.junit.jupiter.api.Test;

import static org.example.ams_be.enums.RequestStatus.DRAFT;
import static org.example.ams_be.support.ModelCoverageAssertions.assertPojoCoverage;
import static org.example.ams_be.support.ModelCoverageAssertions.instantiateAndPopulate;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EntityPojoCoverageTest {

    @Test
    void entityClassesCoverConstructorsAccessorsAndObjectMethods() {
        assertPojoCoverage(Account.class);
        assertPojoCoverage(AttendanceDaily.class);
        assertPojoCoverage(AttendanceSummaryMonthly.class);
        assertPojoCoverage(AuditLog.class);
        assertPojoCoverage(Department.class);
        assertPojoCoverage(Employee.class);
        assertPojoCoverage(EmployeeSchedule.class);
        assertPojoCoverage(FaceEvent.class);
        assertPojoCoverage(Requests.class);
        assertPojoCoverage(ShiftTemplate.class);
    }

    @Test
    void attendanceDailyPrePersistSetsDefaultValues() {
        AttendanceDaily attendanceDaily = new AttendanceDaily();

        attendanceDaily.prePersist();

        assertNotNull(attendanceDaily.getCalculatedAt());
        assertNotNull(attendanceDaily.getUpdatedAt());
        assertEquals(0, attendanceDaily.getLateMinutes());
        assertEquals(0, attendanceDaily.getEarlyLeaveMinutes());
        assertEquals(0, attendanceDaily.getWorkMinutes());
        assertEquals(0, attendanceDaily.getBreakMinutes());
        assertEquals(0, attendanceDaily.getOtMinutesBefore());
        assertEquals(0, attendanceDaily.getOtMinutesAfter());
        assertEquals(0, attendanceDaily.getOtMinutesHoliday());
        assertEquals(AttendanceDaily.AttendanceStatus.ABSENT, attendanceDaily.getStatus());
    }

    @Test
    void attendanceDailyPreUpdateRefreshesUpdatedAt() {
        AttendanceDaily attendanceDaily = instantiateAndPopulate(AttendanceDaily.class, 1);
        java.time.LocalDateTime previous = java.time.LocalDateTime.of(2026, 1, 1, 8, 0);
        attendanceDaily.setUpdatedAt(previous);

        attendanceDaily.preUpdate();

        assertTrue(attendanceDaily.getUpdatedAt().isAfter(previous));
    }

    @Test
    void departmentLifecycleSetsDefaults() {
        Department department = new Department();
        department.setIsActive(null);

        department.onCreate();
        java.time.LocalDateTime createdAt = department.getCreatedAt();
        java.time.LocalDateTime updatedAt = department.getUpdatedAt();
        department.onUpdate();

        assertNotNull(createdAt);
        assertNotNull(updatedAt);
        assertTrue(department.getIsActive());
        assertTrue(!department.getUpdatedAt().isBefore(updatedAt));
    }

    @Test
    void employeeScheduleLifecycleSetsTimestamps() {
        EmployeeSchedule schedule = new EmployeeSchedule();

        schedule.prePersist();
        java.time.LocalDateTime createdAt = schedule.getCreatedAt();
        java.time.LocalDateTime previousUpdatedAt = schedule.getUpdatedAt();
        schedule.preUpdate();

        assertNotNull(createdAt);
        assertNotNull(previousUpdatedAt);
        assertTrue(!schedule.getUpdatedAt().isBefore(previousUpdatedAt));
    }

    @Test
    void requestsLifecycleSetsDraftAndTimestamps() {
        Requests requests = new Requests();
        requests.setStatus(null);

        requests.onCreate();
        java.time.LocalDateTime firstUpdatedAt = requests.getUpdatedAt();
        requests.onUpdate();

        assertEquals(DRAFT, requests.getStatus());
        assertNotNull(requests.getCreatedAt());
        assertNotNull(requests.getSubmittedAt());
        assertTrue(!requests.getUpdatedAt().isBefore(firstUpdatedAt));
    }

    @Test
    void shiftTemplateLifecycleSetsDefaults() {
        ShiftTemplate shiftTemplate = new ShiftTemplate();
        shiftTemplate.setIsActive(null);

        shiftTemplate.prePersist();
        java.time.LocalDateTime createdAt = shiftTemplate.getCreatedAt();
        java.time.LocalDateTime previousUpdatedAt = shiftTemplate.getUpdatedAt();
        shiftTemplate.preUpdate();

        assertTrue(shiftTemplate.getIsActive());
        assertNotNull(createdAt);
        assertTrue(!shiftTemplate.getUpdatedAt().isBefore(previousUpdatedAt));
    }
}
