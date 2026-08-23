package org.example.ams_be.controller;

import org.example.ams_be.dto.response.AttendanceDailyResponse;
import org.example.ams_be.security.UserPrincipal;
import org.example.ams_be.service.AttendanceDailyService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceDailyControllerTest {

    @Mock
    private AttendanceDailyService attendanceDailyService;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private AttendanceDailyController controller;

    @Test
    void adminGetAttendanceBuildsPageableAndDelegates() {
        LocalDate from = LocalDate.of(2026, 3, 1);
        LocalDate to = LocalDate.of(2026, 3, 31);
        Page<AttendanceDailyResponse> page = new PageImpl<>(List.of(AttendanceDailyResponse.builder().attendanceId(1L).build()));
        when(attendanceDailyService.adminGetAttendance(any(), any(), any())).thenReturn(page);

        Page<AttendanceDailyResponse> response = controller.adminGetAttendance(from, to, 1, 5);

        assertEquals(page, response);
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(attendanceDailyService).adminGetAttendance(org.mockito.ArgumentMatchers.eq(from), org.mockito.ArgumentMatchers.eq(to), captor.capture());
        assertEquals(1, captor.getValue().getPageNumber());
        assertEquals(5, captor.getValue().getPageSize());
    }

    @Test
    void employeeGetAttendanceBuildsPageableAndDelegates() {
        LocalDate from = LocalDate.of(2026, 3, 1);
        LocalDate to = LocalDate.of(2026, 3, 31);
        Page<AttendanceDailyResponse> page = new PageImpl<>(List.of());
        when(attendanceDailyService.employeeGetAttendance(any(), any(), any(), any())).thenReturn(page);

        org.springframework.security.core.Authentication auth = org.mockito.Mockito.mock(org.springframework.security.core.Authentication.class);
        org.example.ams_be.security.UserPrincipal principal = org.mockito.Mockito.mock(org.example.ams_be.security.UserPrincipal.class);
        org.mockito.Mockito.when(auth.getPrincipal()).thenReturn(principal);
        org.mockito.Mockito.when(principal.getRole()).thenReturn("ADMIN");
        
        Page<AttendanceDailyResponse> response = controller.employeeGetAttendance(8L, from, to, 2, 15, auth);

        assertEquals(page, response);
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(attendanceDailyService).employeeGetAttendance(org.mockito.ArgumentMatchers.eq(8L), org.mockito.ArgumentMatchers.eq(from), org.mockito.ArgumentMatchers.eq(to), captor.capture());
        assertEquals(2, captor.getValue().getPageNumber());
        assertEquals(15, captor.getValue().getPageSize());
    }

    @Test
    void myAttendanceReadsEmployeeIdFromAuthentication() {
        LocalDate from = LocalDate.of(2026, 3, 1);
        LocalDate to = LocalDate.of(2026, 3, 31);
        Page<AttendanceDailyResponse> page = new PageImpl<>(List.of());
        when(authentication.getPrincipal()).thenReturn(new UserPrincipal(99L, "alice", "employee"));
        when(attendanceDailyService.employeeGetAttendance(any(), any(), any(), any())).thenReturn(page);

        Page<AttendanceDailyResponse> response = controller.myAttendance(from, to, 0, 20, authentication);

        assertEquals(page, response);
        verify(attendanceDailyService).employeeGetAttendance(org.mockito.ArgumentMatchers.eq(99L), org.mockito.ArgumentMatchers.eq(from), org.mockito.ArgumentMatchers.eq(to), any(Pageable.class));
    }
}
