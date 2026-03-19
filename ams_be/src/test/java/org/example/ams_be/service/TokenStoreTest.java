package org.example.ams_be.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TokenStoreTest {

    @Mock
    private StringRedisTemplate redis;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private TokenStore tokenStore;

    @Test
    void storeRefreshTokenStoresHashedKeyWithTtl() {
        when(redis.opsForValue()).thenReturn(valueOperations);

        tokenStore.storeRefreshToken("alice", "refresh-token", 120L);

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Duration> ttlCaptor = ArgumentCaptor.forClass(Duration.class);
        verify(valueOperations).set(keyCaptor.capture(), org.mockito.Mockito.eq("1"), ttlCaptor.capture());
        assertTrue(keyCaptor.getValue().startsWith("refresh:alice:"));
        assertFalse(keyCaptor.getValue().contains("refresh-token"));
        assertTrue(keyCaptor.getValue().length() > "refresh:alice:".length());
        org.junit.jupiter.api.Assertions.assertEquals(Duration.ofSeconds(120L), ttlCaptor.getValue());
    }

    @Test
    void existsReturnsTrueWhenRedisHasKey() {
        when(redis.hasKey(org.mockito.ArgumentMatchers.anyString())).thenReturn(true);

        assertTrue(tokenStore.exists("alice", "refresh-token"));
    }

    @Test
    void existsReturnsFalseWhenRedisHasNoKey() {
        when(redis.hasKey(org.mockito.ArgumentMatchers.anyString())).thenReturn(false);

        assertFalse(tokenStore.exists("alice", "refresh-token"));
    }

    @Test
    void revokeDeletesHashedKey() {
        tokenStore.revoke("alice", "refresh-token");

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(redis).delete(keyCaptor.capture());
        assertTrue(keyCaptor.getValue().startsWith("refresh:alice:"));
        assertFalse(keyCaptor.getValue().contains("refresh-token"));
    }
}
