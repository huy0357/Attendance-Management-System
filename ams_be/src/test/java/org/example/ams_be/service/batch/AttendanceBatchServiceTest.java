package org.example.ams_be.service.batch;

import org.example.ams_be.dto.AttendanceCalculationResult;
import org.example.ams_be.dto.EmployeeLogSummary;
import org.example.ams_be.entity.AttendanceDaily;
import org.example.ams_be.entity.EmployeeSchedule;
import org.example.ams_be.enums.AttendanceCalcStatus;
import org.example.ams_be.repository.AttendanceDailyRepository;
import org.example.ams_be.repository.EmployeeScheduleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceBatchServiceTest {

        @Mock
        private EmployeeScheduleRepository employeeScheduleRepository;

        @Mock
        private AttendanceDailyRepository attendanceDailyRepository;

        @Mock
        private LogCleaningService logCleaningService;

        @Mock
        private AttendanceCalculationService attendanceCalculationService;

        @Mock
        private RequestApplicationService requestApplicationService;

        @InjectMocks
        private AttendanceBatchService attendanceBatchService;

        @Test
        void processAttendanceForDateRunsPipelineAndCreatesNewAttendanceDaily() {
                LocalDate processDate = LocalDate.of(2026, 3, 18);
                EmployeeSchedule schedule = EmployeeSchedule.builder()
                                .employeeId(1L)
                                .workDate(processDate)
                                .shiftId(10L)
                                .build();
                EmployeeLogSummary logs = EmployeeLogSummary.builder().employeeId(1L).logEntries(List.of()).build();
                AttendanceCalculationResult calculated = AttendanceCalculationResult.builder()
                                .employeeId(1L)
                                .workDate(processDate)
                                .shiftId(10L)
                                .actualCheckIn(LocalDateTime.of(2026, 3, 18, 8, 0))
                                .actualCheckOut(LocalDateTime.of(2026, 3, 18, 17, 0))
                                .workingHours(8.0)
                                .lateMinutes(5)
                                .earlyLeaveMinutes(0)
                                .status(AttendanceCalcStatus.LATE)
                                .build();

                when(logCleaningService.fetchAndCleanLogs(processDate)).thenReturn(List.of(logs));
                when(employeeScheduleRepository.findByWorkDate(processDate)).thenReturn(List.of(schedule));
                when(attendanceCalculationService.calculateAttendance(List.of(logs), java.util.Map.of(1L, schedule),
                                processDate))
                                .thenReturn(List.of(calculated));
                when(requestApplicationService.applyRequests(List.of(calculated), processDate))
                                .thenReturn(List.of(calculated));
                when(attendanceDailyRepository.findByEmployeeIdAndWorkDate(1L, processDate))
                                .thenReturn(Optional.empty());

                attendanceBatchService.processAttendanceForDate(processDate);

                @SuppressWarnings("unchecked")
                ArgumentCaptor<List<AttendanceDaily>> captor = ArgumentCaptor.forClass(List.class);
                verify(attendanceDailyRepository).saveAll(captor.capture());
                AttendanceDaily saved = captor.getValue().get(0);
                assertEquals(1L, saved.getEmployeeId());
                assertEquals(processDate, saved.getWorkDate());
                assertEquals(10L, saved.getShiftId());
                assertEquals(480, saved.getWorkMinutes());
                assertEquals(5, saved.getLateMinutes());
                assertEquals(AttendanceDaily.AttendanceStatus.PRESENT, saved.getStatus());
                assertNotNull(saved.getCalculatedAt());
                assertNotNull(saved.getUpdatedAt());
        }

        @Test
        void processAttendanceForDateUpdatesExistingAttendanceAndMapsStatuses() {
                LocalDate processDate = LocalDate.of(2026, 3, 18);
                EmployeeSchedule scheduleOne = EmployeeSchedule.builder().employeeId(1L).workDate(processDate)
                                .shiftId(10L).build();
                EmployeeSchedule scheduleTwo = EmployeeSchedule.builder().employeeId(2L).workDate(processDate)
                                .shiftId(20L).build();

                AttendanceCalculationResult absent = AttendanceCalculationResult.builder()
                                .employeeId(1L)
                                .workDate(processDate)
                                .shiftId(10L)
                                .workingHours(null)
                                .status(AttendanceCalcStatus.MISSING_LOG)
                                .lateMinutes(null)
                                .earlyLeaveMinutes(null)
                                .build();
                AttendanceCalculationResult leave = AttendanceCalculationResult.builder()
                                .employeeId(2L)
                                .workDate(processDate)
                                .shiftId(20L)
                                .workingHours(4.5)
                                .status(AttendanceCalcStatus.ON_LEAVE)
                                .lateMinutes(0)
                                .earlyLeaveMinutes(3)
                                .build();

                when(logCleaningService.fetchAndCleanLogs(processDate)).thenReturn(List.of());
                when(employeeScheduleRepository.findByWorkDate(processDate))
                                .thenReturn(List.of(scheduleOne, scheduleTwo));
                when(attendanceCalculationService.calculateAttendance(List.of(),
                                java.util.Map.of(1L, scheduleOne, 2L, scheduleTwo), processDate))
                                .thenReturn(List.of(absent, leave));
                when(requestApplicationService.applyRequests(List.of(absent, leave), processDate))
                                .thenReturn(List.of(absent, leave));
                when(attendanceDailyRepository.findByEmployeeIdAndWorkDate(1L, processDate))
                                .thenReturn(Optional.of(AttendanceDaily.builder().attendanceId(100L).employeeId(1L)
                                                .workDate(processDate).build()));
                when(attendanceDailyRepository.findByEmployeeIdAndWorkDate(2L, processDate))
                                .thenReturn(Optional.empty());

                attendanceBatchService.processAttendanceForDate(processDate);

                @SuppressWarnings("unchecked")
                ArgumentCaptor<List<AttendanceDaily>> captor = ArgumentCaptor.forClass(List.class);
                verify(attendanceDailyRepository).saveAll(captor.capture());
                List<AttendanceDaily> saved = captor.getValue();

                AttendanceDaily updated = saved.stream().filter(item -> item.getEmployeeId().equals(1L)).findFirst()
                                .orElseThrow();
                assertEquals(100L, updated.getAttendanceId());
                assertEquals(0, updated.getWorkMinutes());
                assertEquals(0, updated.getLateMinutes());
                assertEquals(0, updated.getEarlyLeaveMinutes());
                assertEquals(AttendanceDaily.AttendanceStatus.ABSENT, updated.getStatus());

                AttendanceDaily created = saved.stream().filter(item -> item.getEmployeeId().equals(2L)).findFirst()
                                .orElseThrow();
                assertEquals(270, created.getWorkMinutes());
                assertEquals(AttendanceDaily.AttendanceStatus.LEAVE, created.getStatus());
                assertEquals(3, created.getEarlyLeaveMinutes());
        }

        @Test
        void processAttendanceForDateMapsNullPresentAndEarlyLeaveStatuses() {
                LocalDate processDate = LocalDate.of(2026, 3, 19);
                EmployeeSchedule scheduleOne = EmployeeSchedule.builder().employeeId(1L).workDate(processDate)
                                .shiftId(10L).build();
                EmployeeSchedule scheduleTwo = EmployeeSchedule.builder().employeeId(2L).workDate(processDate)
                                .shiftId(20L).build();
                EmployeeSchedule scheduleThree = EmployeeSchedule.builder().employeeId(3L).workDate(processDate)
                                .shiftId(30L).build();

                AttendanceCalculationResult nullStatus = AttendanceCalculationResult.builder()
                                .employeeId(1L)
                                .workDate(processDate)
                                .shiftId(10L)
                                .workingHours(0.0)
                                .status(null)
                                .build();
                AttendanceCalculationResult earlyLeave = AttendanceCalculationResult.builder()
                                .employeeId(2L)
                                .workDate(processDate)
                                .shiftId(20L)
                                .workingHours(8.0)
                                .status(AttendanceCalcStatus.EARLY_LEAVE)
                                .earlyLeaveMinutes(15)
                                .build();
                AttendanceCalculationResult present = AttendanceCalculationResult.builder()
                                .employeeId(3L)
                                .workDate(processDate)
                                .shiftId(30L)
                                .workingHours(8.0)
                                .status(AttendanceCalcStatus.PRESENT)
                                .build();

                when(logCleaningService.fetchAndCleanLogs(processDate)).thenReturn(List.of());
                when(employeeScheduleRepository.findByWorkDate(processDate))
                                .thenReturn(List.of(scheduleOne, scheduleTwo, scheduleThree));
                when(attendanceCalculationService.calculateAttendance(List.of(),
                                java.util.Map.of(1L, scheduleOne, 2L, scheduleTwo, 3L, scheduleThree), processDate))
                                .thenReturn(List.of(nullStatus, earlyLeave, present));
                when(requestApplicationService.applyRequests(List.of(nullStatus, earlyLeave, present), processDate))
                                .thenReturn(List.of(nullStatus, earlyLeave, present));
                when(attendanceDailyRepository.findByEmployeeIdAndWorkDate(1L, processDate))
                                .thenReturn(Optional.empty());
                when(attendanceDailyRepository.findByEmployeeIdAndWorkDate(2L, processDate))
                                .thenReturn(Optional.empty());
                when(attendanceDailyRepository.findByEmployeeIdAndWorkDate(3L, processDate))
                                .thenReturn(Optional.empty());

                attendanceBatchService.processAttendanceForDate(processDate);

                @SuppressWarnings("unchecked")
                ArgumentCaptor<List<AttendanceDaily>> captor = ArgumentCaptor.forClass(List.class);
                verify(attendanceDailyRepository).saveAll(captor.capture());
                List<AttendanceDaily> saved = captor.getValue();

                AttendanceDaily absent = saved.stream().filter(item -> item.getEmployeeId().equals(1L)).findFirst()
                                .orElseThrow();
                AttendanceDaily early = saved.stream().filter(item -> item.getEmployeeId().equals(2L)).findFirst()
                                .orElseThrow();
                AttendanceDaily presentDaily = saved.stream().filter(item -> item.getEmployeeId().equals(3L))
                                .findFirst().orElseThrow();

                assertEquals(AttendanceDaily.AttendanceStatus.ABSENT, absent.getStatus());
                assertEquals(AttendanceDaily.AttendanceStatus.PRESENT, early.getStatus());
                assertEquals(15, early.getEarlyLeaveMinutes());
                assertEquals(AttendanceDaily.AttendanceStatus.PRESENT, presentDaily.getStatus());
        }

        @Test
        void processAttendanceForDateUsesLastScheduleWhenDuplicateEmployeeExists() {
                LocalDate processDate = LocalDate.of(2026, 3, 20);
                EmployeeSchedule first = EmployeeSchedule.builder().employeeId(1L).workDate(processDate).shiftId(10L)
                                .build();
                EmployeeSchedule second = EmployeeSchedule.builder().employeeId(1L).workDate(processDate).shiftId(20L)
                                .build();
                AttendanceCalculationResult result = AttendanceCalculationResult.builder()
                                .employeeId(1L)
                                .workDate(processDate)
                                .shiftId(20L)
                                .workingHours(8.0)
                                .status(AttendanceCalcStatus.PRESENT)
                                .build();

                when(logCleaningService.fetchAndCleanLogs(processDate)).thenReturn(List.of());
                when(employeeScheduleRepository.findByWorkDate(processDate)).thenReturn(List.of(first, second));
                when(attendanceCalculationService.calculateAttendance(List.of(), java.util.Map.of(1L, second),
                                processDate))
                                .thenReturn(List.of(result));
                when(requestApplicationService.applyRequests(List.of(result), processDate)).thenReturn(List.of(result));
                when(attendanceDailyRepository.findByEmployeeIdAndWorkDate(1L, processDate))
                                .thenReturn(Optional.empty());

                attendanceBatchService.processAttendanceForDate(processDate);

                @SuppressWarnings("unchecked")
                ArgumentCaptor<List<AttendanceDaily>> captor = ArgumentCaptor.forClass(List.class);
                verify(attendanceDailyRepository).saveAll(captor.capture());
                assertEquals(20L, captor.getValue().get(0).getShiftId());
        }

        @Test
        void processAttendanceForDateHandlesLogSummaryWithNullEntries() {
                LocalDate processDate = LocalDate.of(2026, 3, 21);
                EmployeeLogSummary logs = EmployeeLogSummary.builder()
                                .employeeId(1L)
                                .logEntries(null)
                                .build();

                when(logCleaningService.fetchAndCleanLogs(processDate)).thenReturn(List.of(logs));
                when(employeeScheduleRepository.findByWorkDate(processDate)).thenReturn(List.of());
                when(attendanceCalculationService.calculateAttendance(List.of(logs), java.util.Map.of(), processDate))
                                .thenReturn(List.of());
                when(requestApplicationService.applyRequests(List.of(), processDate)).thenReturn(List.of());

                attendanceBatchService.processAttendanceForDate(processDate);

                verify(attendanceDailyRepository).saveAll(List.of());
        }
}
