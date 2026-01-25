package org.example.ams_be.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;

@Service
public class TokenStore {

    private final StringRedisTemplate redis;

    public TokenStore(StringRedisTemplate redis) {
        this.redis = redis;
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
        redis.opsForValue().set(key(username, refreshToken), "1", Duration.ofSeconds(ttlSeconds));
    }

    public boolean exists(String username, String refreshToken) {
        return Boolean.TRUE.equals(redis.hasKey(key(username, refreshToken)));
    }

    public void revoke(String username, String refreshToken) {
        redis.delete(key(username, refreshToken));
    }
}
