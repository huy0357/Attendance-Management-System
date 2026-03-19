package org.example.ams_be.controller;

import org.example.ams_be.dto.request.ShiftTemplateUpsertRequest;
import org.example.ams_be.dto.response.ShiftTemplateResponse;
import org.example.ams_be.service.ShiftTemplateService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShiftTemplateControllerTest {

    @Mock
    private ShiftTemplateService service;

    @InjectMocks
    private ShiftTemplateController controller;

    @Test
    void listDelegates() {
        List<ShiftTemplateResponse> expected = List.of(response(1L));
        when(service.list(true, "DAY")).thenReturn(expected);

        List<ShiftTemplateResponse> actual = controller.list(true, "DAY");

        assertEquals(expected, actual);
    }

    @Test
    void getDelegates() {
        ShiftTemplateResponse expected = response(2L);
        when(service.get(2L)).thenReturn(expected);

        ShiftTemplateResponse actual = controller.get(2L);

        assertEquals(expected, actual);
    }

    @Test
    void createDelegates() {
        ShiftTemplateUpsertRequest request = ShiftTemplateUpsertRequest.builder().shiftCode("DAY").build();
        ShiftTemplateResponse expected = response(3L);
        when(service.create(request)).thenReturn(expected);

        ShiftTemplateResponse actual = controller.create(request);

        assertEquals(expected, actual);
    }

    @Test
    void updateDelegates() {
        ShiftTemplateUpsertRequest request = ShiftTemplateUpsertRequest.builder().shiftCode("NIGHT").build();
        ShiftTemplateResponse expected = response(4L);
        when(service.update(4L, request)).thenReturn(expected);

        ShiftTemplateResponse actual = controller.update(4L, request);

        assertEquals(expected, actual);
    }

    @Test
    void setActiveDelegates() {
        ShiftTemplateResponse expected = response(5L);
        when(service.setActive(5L, false)).thenReturn(expected);

        ShiftTemplateResponse actual = controller.setActive(5L, false);

        assertEquals(expected, actual);
    }

    @Test
    void deleteDelegates() {
        controller.delete(6L);

        verify(service).delete(6L);
    }

    private ShiftTemplateResponse response(Long id) {
        return ShiftTemplateResponse.builder()
                .shiftId(id)
                .shiftCode("DAY")
                .shiftName("Day Shift")
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(17, 0))
                .build();
    }
}
