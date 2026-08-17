package org.example.ams_be.service;

import org.example.ams_be.dto.MonthlyAttendanceEmailDto;
import org.example.ams_be.repository.AttendanceSummaryMonthlyRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.example.ams_be.repository.AccountRepository;

@ExtendWith(MockitoExtension.class)
class AttendanceEmailServiceTest {

    @Mock
    private AttendanceSummaryMonthlyRepository attendanceSummaryMonthlyRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private org.example.ams_be.repository.EmployeeRepository employeeRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private AccountRepository accountRepository;

    @InjectMocks
    private AttendanceEmailService attendanceEmailService;

    @Test
    void sendMonthlyAttendanceEmailThrowsWhenSummaryNotFound() {
        when(attendanceSummaryMonthlyRepository.findEmailSummaryByMonthAndEmployee("2026-03", 1L))
                .thenReturn(Optional.empty());
        when(employeeRepository.findById(1L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> attendanceEmailService.sendMonthlyAttendanceEmail("2026-03", 1L)
        );

        assertEquals("Employee not found: 1", ex.getMessage());
    }

    @Test
    void sendMonthlyAttendanceEmailThrowsWhenEmployeeHasNoEmail() {
        MonthlyAttendanceEmailDto summary = summary();
        summary.setEmail(" ");
        when(attendanceSummaryMonthlyRepository.findEmailSummaryByMonthAndEmployee("2026-03", 1L))
                .thenReturn(Optional.of(summary));

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> attendanceEmailService.sendMonthlyAttendanceEmail("2026-03", 1L)
        );

        assertEquals("Employee has no email: 1", ex.getMessage());
    }

    @Test
    void sendMonthlyAttendanceEmailThrowsWhenEmployeeEmailIsNull() {
        MonthlyAttendanceEmailDto summary = summary();
        summary.setEmail(null);
        when(attendanceSummaryMonthlyRepository.findEmailSummaryByMonthAndEmployee("2026-03", 1L))
                .thenReturn(Optional.of(summary));

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> attendanceEmailService.sendMonthlyAttendanceEmail("2026-03", 1L)
        );

        assertEquals("Employee has no email: 1", ex.getMessage());
    }

    @Test
    void sendMonthlyAttendanceEmailSendsHtmlEmailWithExpectedSubjectAndBody() {
        MonthlyAttendanceEmailDto summary = summary();
        when(attendanceSummaryMonthlyRepository.findEmailSummaryByMonthAndEmployee("2026-03", 1L))
                .thenReturn(Optional.of(summary));

        attendanceEmailService.sendMonthlyAttendanceEmail("2026-03", 1L);

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendHtmlEmail(eq("alice@company.com"),
                eq("Thông báo tổng hợp chấm công tháng 2026-03"),
                bodyCaptor.capture());
        String body = bodyCaptor.getValue();
        org.junit.jupiter.api.Assertions.assertTrue(body.contains("Alice"));
        org.junit.jupiter.api.Assertions.assertTrue(body.contains("20"));
        org.junit.jupiter.api.Assertions.assertTrue(body.contains("120 phút"));
    }

    @Test
    void sendMonthlyAttendanceEmailUsesFallbackValuesWhenSummaryFieldsAreNull() {
        MonthlyAttendanceEmailDto summary = summary();
        summary.setEmployeeName(null);
        summary.setEmployeeCode(null);
        summary.setWorkDays(null);
        summary.setLeaveDays(null);
        summary.setAbsentDays(null);
        summary.setLateMinutes(null);
        summary.setOtMinutes(null);
        when(attendanceSummaryMonthlyRepository.findEmailSummaryByMonthAndEmployee("2026-03", 1L))
                .thenReturn(Optional.of(summary));

        attendanceEmailService.sendMonthlyAttendanceEmail("2026-03", 1L);

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendHtmlEmail(eq("alice@company.com"),
                eq("Thông báo tổng hợp chấm công tháng 2026-03"),
                bodyCaptor.capture());
        String body = bodyCaptor.getValue();
        org.junit.jupiter.api.Assertions.assertTrue(body.contains("<b></b> ()"));
        org.junit.jupiter.api.Assertions.assertTrue(body.contains(">0<"));
        org.junit.jupiter.api.Assertions.assertTrue(body.contains("0 phút"));
        org.junit.jupiter.api.Assertions.assertFalse(body.contains("null"));
    }

    @Test
    void sendMonthlyAttendanceEmailToAllSendsEverySummaryAndContinuesAfterFailure() {
        org.example.ams_be.dto.EmployeeDto emp1 = new org.example.ams_be.dto.EmployeeDto();
        emp1.employeeId = 1L; emp1.email = "alice@company.com"; emp1.status = "ACTIVE";
        org.example.ams_be.dto.EmployeeDto emp2 = new org.example.ams_be.dto.EmployeeDto();
        emp2.employeeId = 2L; emp2.email = "bob@company.com"; emp2.status = "ACTIVE";

        when(employeeRepository.findAll()).thenReturn(List.of(emp1, emp2));

        MonthlyAttendanceEmailDto first = summary();
        MonthlyAttendanceEmailDto second = summary();
        second.setEmployeeId(2L);
        second.setEmployeeCode("EMP002");
        second.setEmployeeName("Bob");
        second.setEmail("bob@company.com");
        when(attendanceSummaryMonthlyRepository.findAllEmailSummaryByMonth("2026-03"))
                .thenReturn(List.of(first, second));
        doThrow(new RuntimeException("mail failed"))
                .when(emailService).sendHtmlEmail(eq("alice@company.com"), contains("2026-03"), org.mockito.ArgumentMatchers.anyString());

        attendanceEmailService.sendMonthlyAttendanceEmailToAll("2026-03");

        verify(emailService, times(2))
                .sendHtmlEmail(org.mockito.ArgumentMatchers.anyString(), eq("Thông báo tổng hợp chấm công tháng 2026-03"), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void sendMonthlyAttendanceEmailToAllDoesNothingWhenSummaryListEmpty() {
        when(employeeRepository.findAll()).thenReturn(List.of());
        when(attendanceSummaryMonthlyRepository.findAllEmailSummaryByMonth("2026-03"))
                .thenReturn(List.of());

        attendanceEmailService.sendMonthlyAttendanceEmailToAll("2026-03");

        verify(emailService, times(0)).sendHtmlEmail(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }

    private MonthlyAttendanceEmailDto summary() {
        return MonthlyAttendanceEmailDto.builder()
                .employeeId(1L)
                .employeeCode("EMP001")
                .employeeName("Alice")
                .email("alice@company.com")
                .monthKey("2026-03")
                .workDays(BigDecimal.valueOf(20))
                .leaveDays(BigDecimal.valueOf(2))
                .absentDays(BigDecimal.ONE)
                .lateMinutes(15)
                .otMinutes(120)
                .build();
    }
}
