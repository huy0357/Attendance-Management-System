package org.example.ams_be.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.ams_be.entity.AuditLog;
import org.example.ams_be.repository.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private AuditLogService auditLogService;

    @Test
    void saveAuditLogSavesWithSerializedValues() throws Exception {
        when(objectMapper.writeValueAsString("old")).thenReturn("\"old\"");
        when(objectMapper.writeValueAsString("new")).thenReturn("\"new\"");

        auditLogService.saveAuditLog("UPDATE", "EMPLOYEE", 1L, 2L, "old", "new");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertEquals("UPDATE", captor.getValue().getAction());
        assertEquals("EMPLOYEE", captor.getValue().getEntityType());
        assertEquals(1L, captor.getValue().getEntityId());
        assertEquals(2L, captor.getValue().getActorId());
        assertEquals("\"old\"", captor.getValue().getOldValueJson());
        assertEquals("\"new\"", captor.getValue().getNewValueJson());
        assertNotNull(captor.getValue().getCreatedAt());
    }

    @Test
    void saveAuditLogSavesNullOldAndNewWhenDataNull() {
        auditLogService.saveAuditLog("DELETE", "DEPARTMENT", 3L, 4L, null, null);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertEquals(null, captor.getValue().getOldValueJson());
        assertEquals(null, captor.getValue().getNewValueJson());
    }

    @Test
    void saveAuditLogSwallowsSerializationException() throws Exception {
        doThrow(new RuntimeException("json fail")).when(objectMapper).writeValueAsString("bad");

        auditLogService.saveAuditLog("CREATE", "ACCOUNT", 5L, 6L, "bad", null);

        verifyNoInteractions(auditLogRepository);
    }
}
