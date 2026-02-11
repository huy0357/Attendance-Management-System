package org.example.ams_be.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.request.ShiftTemplateUpsertRequest;
import org.example.ams_be.dto.response.ShiftTemplateResponse;
import org.example.ams_be.service.ShiftTemplateService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/shifts")
@RequiredArgsConstructor
public class ShiftTemplateController {

    private final ShiftTemplateService service;

    @GetMapping
    public List<ShiftTemplateResponse> list(
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String q
    ) {
        return service.list(active, q);
    }

    @GetMapping("/{id}")
    public ShiftTemplateResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    public ShiftTemplateResponse create(@Valid @RequestBody ShiftTemplateUpsertRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public ShiftTemplateResponse update(@PathVariable Long id, @Valid @RequestBody ShiftTemplateUpsertRequest req) {
        return service.update(id, req);
    }

    @PatchMapping("/{id}/active")
    public ShiftTemplateResponse setActive(@PathVariable Long id, @RequestParam boolean active) {
        return service.setActive(id, active);
    }
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

}
