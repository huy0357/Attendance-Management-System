package org.example.ams_be.service;

import org.example.ams_be.dto.request.ShiftTemplateUpsertRequest;
import org.example.ams_be.dto.response.ShiftTemplateResponse;
import org.example.ams_be.entity.ShiftTemplate;
import org.example.ams_be.repository.ShiftTemplateRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShiftTemplateServiceTest {

    @Mock
    private ShiftTemplateRepository repo;

    @InjectMocks
    private ShiftTemplateService shiftTemplateService;

    @Test
    void listFiltersByActiveAndKeyword() {
        when(repo.findAll()).thenReturn(List.of(
                shift(1L, "DAY", "Day Shift", true),
                shift(2L, "NIGHT", "Night Shift", false)
        ));

        List<ShiftTemplateResponse> responses = shiftTemplateService.list(true, "day");

        assertEquals(1, responses.size());
        assertEquals(1L, responses.get(0).getShiftId());
        assertEquals("DAY", responses.get(0).getShiftCode());
    }

    @Test
    void listReturnsAllWhenFiltersAreNullOrBlank() {
        when(repo.findAll()).thenReturn(List.of(
                shift(1L, "DAY", "Day Shift", true),
                shift(2L, "NIGHT", "Night Shift", false)
        ));

        List<ShiftTemplateResponse> responses = shiftTemplateService.list(null, " ");

        assertEquals(2, responses.size());
    }

    @Test
    void listReturnsAllWhenKeywordIsNull() {
        when(repo.findAll()).thenReturn(List.of(
                shift(1L, "DAY", "Day Shift", true),
                shift(2L, "NIGHT", "Night Shift", false)
        ));

        List<ShiftTemplateResponse> responses = shiftTemplateService.list(true, null);

        assertEquals(1, responses.size());
        assertEquals("DAY", responses.get(0).getShiftCode());
    }

    @Test
    void listMatchesKeywordAgainstShiftNameForInactiveShift() {
        when(repo.findAll()).thenReturn(List.of(
                shift(1L, "DAY", "Morning", true),
                shift(2L, "NIGHT", "Night Shift", false)
        ));

        List<ShiftTemplateResponse> responses = shiftTemplateService.list(false, "shift");

        assertEquals(1, responses.size());
        assertEquals(2L, responses.get(0).getShiftId());
        assertEquals("NIGHT", responses.get(0).getShiftCode());
    }

    @Test
    void listReturnsEmptyWhenKeywordMatchesNeitherCodeNorName() {
        when(repo.findAll()).thenReturn(List.of(
                shift(1L, "DAY", "Day Shift", true),
                shift(2L, "NIGHT", "Night Shift", false)
        ));

        List<ShiftTemplateResponse> responses = shiftTemplateService.list(null, "weekend");

        assertTrue(responses.isEmpty());
    }

    @Test
    void getReturnsMappedResponseWhenFound() {
        ShiftTemplate entity = shift(1L, "DAY", "Day Shift", true);
        when(repo.findById(1L)).thenReturn(Optional.of(entity));

        ShiftTemplateResponse response = shiftTemplateService.get(1L);

        assertEquals(1L, response.getShiftId());
        assertEquals("DAY", response.getShiftCode());
        assertEquals(LocalTime.of(8, 0), response.getStartTime());
    }

    @Test
    void getThrowsWhenShiftNotFound() {
        when(repo.findById(9L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> shiftTemplateService.get(9L));

        assertEquals("Shift not found", ex.getMessage());
    }

    @Test
    void createThrowsWhenShiftCodeAlreadyExists() {
        ShiftTemplateUpsertRequest request = validRequest(false, 60, 420);
        when(repo.existsByShiftCode("DAY")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> shiftTemplateService.create(request));

        assertEquals("shift_code already exists", ex.getMessage());
    }

    @Test
    void createThrowsWhenDayShiftEndIsNotAfterStart() {
        ShiftTemplateUpsertRequest request = validRequest(false, 60, 420);
        request.setEndTime(LocalTime.of(8, 0));
        when(repo.existsByShiftCode("DAY")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> shiftTemplateService.create(request));

        assertTrue(ex.getMessage().contains("gi"));
    }

    @Test
    void createThrowsWhenBreakMinutesExceedDuration() {
        ShiftTemplateUpsertRequest request = validRequest(false, 600, 10);
        when(repo.existsByShiftCode("DAY")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> shiftTemplateService.create(request));

        assertTrue(ex.getMessage().contains("break_minutes"));
    }

    @Test
    void createThrowsWhenMinWorkMinutesExceedNetDuration() {
        ShiftTemplateUpsertRequest request = validRequest(false, 60, 500);
        when(repo.existsByShiftCode("DAY")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> shiftTemplateService.create(request));

        assertTrue(ex.getMessage().contains("min_work_minutes"));
    }

    @Test
    void createAllowsValidDayShift() {
        ShiftTemplateUpsertRequest request = validRequest(false, 60, 420);
        when(repo.existsByShiftCode("DAY")).thenReturn(false);
        when(repo.save(any(ShiftTemplate.class))).thenAnswer(invocation -> {
            ShiftTemplate saved = invocation.getArgument(0);
            saved.setShiftId(7L);
            return saved;
        });

        ShiftTemplateResponse response = shiftTemplateService.create(request);

        assertEquals(7L, response.getShiftId());
        assertEquals("DAY", response.getShiftCode());
        assertFalse(response.getIsNightShift());
    }

    @Test
    void createAllowsOvernightShiftAndTrimsFieldsBeforeSaving() {
        ShiftTemplateUpsertRequest request = validRequest(true, 60, 420);
        request.setShiftCode(" DAY-N ");
        request.setShiftName(" Night Shift ");
        request.setStartTime(LocalTime.of(22, 0));
        request.setEndTime(LocalTime.of(6, 0));

        when(repo.existsByShiftCode(" DAY-N ")).thenReturn(false);
        when(repo.save(any(ShiftTemplate.class))).thenAnswer(invocation -> {
            ShiftTemplate saved = invocation.getArgument(0);
            saved.setShiftId(9L);
            return saved;
        });

        ShiftTemplateResponse response = shiftTemplateService.create(request);

        ArgumentCaptor<ShiftTemplate> captor = ArgumentCaptor.forClass(ShiftTemplate.class);
        verify(repo).save(captor.capture());
        assertEquals("DAY-N", captor.getValue().getShiftCode());
        assertEquals("Night Shift", captor.getValue().getShiftName());
        assertTrue(captor.getValue().getIsNightShift());
        assertEquals(9L, response.getShiftId());
        assertEquals("DAY-N", response.getShiftCode());
    }

    @Test
    void createAllowsNightShiftWhenEndIsAfterStart() {
        ShiftTemplateUpsertRequest request = validRequest(true, 30, 120);
        request.setStartTime(LocalTime.of(18, 0));
        request.setEndTime(LocalTime.of(22, 0));
        when(repo.existsByShiftCode("DAY")).thenReturn(false);
        when(repo.save(any(ShiftTemplate.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ShiftTemplateResponse response = shiftTemplateService.create(request);

        assertEquals(LocalTime.of(22, 0), response.getEndTime());
    }

    @Test
    void updateThrowsWhenDuplicateCodeExistsOnAnotherShift() {
        ShiftTemplate existing = shift(1L, "DAY", "Day Shift", true);
        ShiftTemplateUpsertRequest request = validRequest(false, 60, 420);
        when(repo.findById(1L)).thenReturn(Optional.of(existing));
        when(repo.existsByShiftCodeAndShiftIdNot("DAY", 1L)).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> shiftTemplateService.update(1L, request));

        assertEquals("shift_code already exists", ex.getMessage());
    }

    @Test
    void updateMutatesEntityAndSavesWhenValid() {
        ShiftTemplate existing = shift(1L, "OLD", "Old Shift", true);
        ShiftTemplateUpsertRequest request = validRequest(false, 30, 450);
        request.setShiftCode("NEW");
        request.setShiftName("New Shift");
        when(repo.findById(1L)).thenReturn(Optional.of(existing));
        when(repo.existsByShiftCodeAndShiftIdNot("NEW", 1L)).thenReturn(false);
        when(repo.save(existing)).thenReturn(existing);

        ShiftTemplateResponse response = shiftTemplateService.update(1L, request);

        assertEquals("NEW", existing.getShiftCode());
        assertEquals("New Shift", existing.getShiftName());
        assertEquals(30, existing.getBreakMinutes());
        assertEquals(450, existing.getMinWorkMinutes());
        assertEquals("NEW", response.getShiftCode());
    }

    @Test
    void updateThrowsWhenShiftNotFound() {
        when(repo.findById(10L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> shiftTemplateService.update(10L, validRequest(false, 60, 420)));

        assertEquals("Shift not found", ex.getMessage());
    }

    @Test
    void setActiveUpdatesFlagAndSaves() {
        ShiftTemplate existing = shift(1L, "DAY", "Day Shift", true);
        when(repo.findById(1L)).thenReturn(Optional.of(existing));
        when(repo.save(existing)).thenReturn(existing);

        ShiftTemplateResponse response = shiftTemplateService.setActive(1L, false);

        assertFalse(existing.getIsActive());
        assertFalse(response.getIsActive());
    }

    @Test
    void setActiveThrowsWhenShiftNotFound() {
        when(repo.findById(11L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> shiftTemplateService.setActive(11L, true));

        assertEquals("Shift not found", ex.getMessage());
    }

    @Test
    void deleteSetsInactiveAndSavesEntity() {
        ShiftTemplate existing = shift(1L, "DAY", "Day Shift", true);
        when(repo.findById(1L)).thenReturn(Optional.of(existing));

        shiftTemplateService.delete(1L);

        assertFalse(existing.getIsActive());
        verify(repo).save(existing);
    }

    @Test
    void deleteThrowsWhenShiftNotFound() {
        when(repo.findById(12L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> shiftTemplateService.delete(12L));

        assertEquals("Shift not found", ex.getMessage());
    }

    private ShiftTemplateUpsertRequest validRequest(boolean isNightShift, int breakMinutes, int minWorkMinutes) {
        return ShiftTemplateUpsertRequest.builder()
                .shiftCode("DAY")
                .shiftName("Day Shift")
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(17, 0))
                .breakMinutes(breakMinutes)
                .graceInMinutes(5)
                .graceOutMinutes(5)
                .isNightShift(isNightShift)
                .minWorkMinutes(minWorkMinutes)
                .isActive(true)
                .build();
    }

    private ShiftTemplate shift(Long id, String code, String name, boolean active) {
        return ShiftTemplate.builder()
                .shiftId(id)
                .shiftCode(code)
                .shiftName(name)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(17, 0))
                .breakMinutes(60)
                .graceInMinutes(5)
                .graceOutMinutes(5)
                .isNightShift(false)
                .minWorkMinutes(420)
                .isActive(active)
                .createdAt(LocalDateTime.of(2026, 3, 1, 8, 0))
                .updatedAt(LocalDateTime.of(2026, 3, 1, 9, 0))
                .build();
    }
}
