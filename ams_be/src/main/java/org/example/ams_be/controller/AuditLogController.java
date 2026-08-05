package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.request.PageRequestDto;
import org.example.ams_be.dto.response.PageResponse;
import org.example.ams_be.entity.AuditLog;
import org.example.ams_be.service.AuditLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR')")
    public ResponseEntity<PageResponse<AuditLog>> getLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Long actorId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        PageRequestDto requestDto = new PageRequestDto();
        requestDto.page = page;
        requestDto.size = size;
        requestDto.sortBy = sortBy;
        requestDto.sortDir = sortDir;

        return ResponseEntity.ok(auditLogService.getAllLogs(entityType, action, actorId, requestDto));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR')")
    public ResponseEntity<AuditLog> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(auditLogService.getLogDetail(id));
    }
}