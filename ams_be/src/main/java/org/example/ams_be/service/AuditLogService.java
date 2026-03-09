package org.example.ams_be.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.example.ams_be.entity.AuditLog;
import org.example.ams_be.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAuditLog(String action, String entityType, Long entityId, Long actorId, Object oldData,
            Object newData) {
        try {
            AuditLog log = new AuditLog();
            log.setAction(action);
            log.setEntityType(entityType);
            log.setEntityId(entityId);
            log.setActorId(actorId);

            log.setOldValueJson(oldData != null ? objectMapper.writeValueAsString(oldData) : null);
            log.setNewValueJson(newData != null ? objectMapper.writeValueAsString(newData) : null);

            log.setCreatedAt(LocalDateTime.now());

            auditLogRepository.save(log);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
