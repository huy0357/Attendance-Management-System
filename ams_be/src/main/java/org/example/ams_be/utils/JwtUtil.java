package org.example.ams_be.utils;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.Map;

@Component
public class JwtUtil {

    private final Key key;
    private final long accessTtlSeconds;
    private final long refreshTtlSeconds;

    public JwtUtil(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-ttl-seconds}") long accessTtlSeconds,
            @Value("${app.jwt.refresh-ttl-seconds}") long refreshTtlSeconds
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTtlSeconds = accessTtlSeconds;
        this.refreshTtlSeconds = refreshTtlSeconds;
    }

    public long getAccessTtlSeconds() { return accessTtlSeconds; }
    public long getRefreshTtlSeconds() { return refreshTtlSeconds; }

    public String generateAccessToken(String username, String role) {
        return generateToken(username, role, accessTtlSeconds, Map.of("type", "access"));
    }

    public String generateRefreshToken(String username, String role) {
        return generateToken(username, role, refreshTtlSeconds, Map.of("type", "refresh"));
    }

    private String generateToken(String username, String role, long ttlSeconds, Map<String, Object> extraClaims) {
        long nowMs = System.currentTimeMillis();
        Date now = new Date(nowMs);
        Date exp = new Date(nowMs + ttlSeconds * 1000);

        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(now)
                .setExpiration(exp)
                .addClaims(extraClaims)
                .claim("role", role)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims parseClaims(String token) throws JwtException {
        return Jwts.parserBuilder().setSigningKey(key).build()
                .parseClaimsJws(token).getBody();
    }

    public boolean isExpired(String token) {
        try {
            return parseClaims(token).getExpiration().before(new Date());
        } catch (JwtException e) {
            return true;
        }
    }

    public String getUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public String getRole(String token) {
        Object role = parseClaims(token).get("role");
        return role == null ? null : role.toString();
    }

    public String getType(String token) {
        Object type = parseClaims(token).get("type");
        return type == null ? null : type.toString();
    }
}
