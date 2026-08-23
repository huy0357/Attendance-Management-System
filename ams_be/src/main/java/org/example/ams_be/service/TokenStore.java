package org.example.ams_be.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenStore {

    private final StringRedisTemplate redis;
    private boolean redisAvailable = true;

    // In-memory fallback when Redis is unavailable
    private final ConcurrentHashMap<String, Long> memoryStore = new ConcurrentHashMap<>();

    public TokenStore(StringRedisTemplate redis) {
        this.redis = redis;
        // Test Redis connectivity
        try {
            redis.getConnectionFactory().getConnection().ping();
        } catch (Exception e) {
            System.err.println("⚠️ Redis unavailable, using in-memory token store (dev mode)");
            redisAvailable = false;
        }
    }

    private String sha256(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] out = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(out);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String key(String username, String refreshToken) {
        return "refresh:" + username + ":" + sha256(refreshToken);
    }

    public void storeRefreshToken(String username, String refreshToken, long ttlSeconds) {
        if (redisAvailable) {
            try {
                redis.opsForValue().set(key(username, refreshToken), "1", Duration.ofSeconds(ttlSeconds));
                return;
            } catch (Exception e) {
                redisAvailable = false;
            }
        }
        // Fallback: in-memory with expiry timestamp
        memoryStore.put(key(username, refreshToken), System.currentTimeMillis() + ttlSeconds * 1000);
    }

    public boolean exists(String username, String refreshToken) {
        if (redisAvailable) {
            try {
                return Boolean.TRUE.equals(redis.hasKey(key(username, refreshToken)));
            } catch (Exception e) {
                redisAvailable = false;
            }
        }
        // Fallback
        Long expiry = memoryStore.get(key(username, refreshToken));
        if (expiry == null) return false;
        if (System.currentTimeMillis() > expiry) {
            memoryStore.remove(key(username, refreshToken));
            return false;
        }
        return true;
    }

    public void revoke(String username, String refreshToken) {
        if (redisAvailable) {
            try {
                redis.delete(key(username, refreshToken));
                return;
            } catch (Exception e) {
                redisAvailable = false;
            }
        }
        memoryStore.remove(key(username, refreshToken));
    }
}
