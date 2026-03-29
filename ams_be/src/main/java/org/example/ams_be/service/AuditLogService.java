package org.example.ams_be.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;

import org.example.ams_be.dto.response.PageResponse;
import org.example.ams_be.entity.AuditLog;
import org.example.ams_be.repository.AuditLogRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.criteria.Predicate;
import org.example.ams_be.dto.request.PageRequestDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;


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

    public PageResponse<AuditLog> getAllLogs(String entityType, String action, Long actorId, PageRequestDto pageRequest) {
        Sort sort = Sort.by(pageRequest.sortDir.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC, 
                            pageRequest.sortBy != null ? pageRequest.sortBy : "createdAt");
        Pageable pageable = PageRequest.of(pageRequest.page - 1, pageRequest.size, sort);

        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (entityType != null && !entityType.isEmpty()) predicates.add(cb.equal(root.get("entityType"), entityType));
            if (action != null && !action.isEmpty()) predicates.add(cb.equal(root.get("action"), action));
            if (actorId != null) predicates.add(cb.equal(root.get("actorId"), actorId));
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<AuditLog> pageResult = auditLogRepository.findAll(spec, pageable);
        
        return new PageResponse<>(
            pageResult.getContent(), 
            pageRequest.page, 
            pageRequest.size, 
            pageResult.getTotalElements()
        );
    }

    public AuditLog getLogDetail(Long id) {
        return auditLogRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Log với ID: " + id));
    }
}
