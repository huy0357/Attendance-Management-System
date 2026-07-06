package org.example.ams_be.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private static final String SECRET = "12345678901234567890123456789012";

    private final JwtUtil jwtUtil = new JwtUtil(SECRET, 3600, 7200);

    @Test
    void generateAccessTokenContainsExpectedClaims() {
        String token = jwtUtil.generateAccessToken("alice", "ADMIN", 1L);

        Claims claims = jwtUtil.parseClaims(token);

        assertEquals("alice", claims.getSubject());
        assertEquals("ADMIN", jwtUtil.getRole(token));
        assertEquals("access", jwtUtil.getType(token));
        assertFalse(jwtUtil.isExpired(token));
    }

    @Test
    void generateRefreshTokenContainsRefreshTypeAndConfiguredTtl() {
        String token = jwtUtil.generateRefreshToken("bob", "EMPLOYEE", 2L);

        Claims claims = jwtUtil.parseClaims(token);
        long ttlSeconds = (claims.getExpiration().getTime() - claims.getIssuedAt().getTime()) / 1000;

        assertEquals("bob", jwtUtil.getUsername(token));
        assertEquals("EMPLOYEE", jwtUtil.getRole(token));
        assertEquals("refresh", jwtUtil.getType(token));
        assertEquals(7200L, ttlSeconds);
    }

    @Test
    void getEmployeeIdReturnsClaimValueWhenPresent() {
        String token = buildTokenWithEmployeeId(99L);

        assertEquals(99L, jwtUtil.getEmployeeId(token));
    }

    @Test
    void getEmployeeIdReturnsNullWhenClaimMissing() {
        String token = jwtUtil.generateAccessToken("charlie", "ADMIN", null);

        assertNull(jwtUtil.getEmployeeId(token));
    }

    @Test
    void isExpiredReturnsTrueForExpiredToken() {
        JwtUtil expiredJwtUtil = new JwtUtil(SECRET, -1, 7200);
        String token = expiredJwtUtil.generateAccessToken("david", "ADMIN", 1L);

        assertTrue(expiredJwtUtil.isExpired(token));
    }

    @Test
    void isExpiredReturnsTrueForInvalidToken() {
        assertTrue(jwtUtil.isExpired("invalid-token"));
    }

    @Test
    void parseClaimsThrowsForInvalidToken() {
        assertThrows(JwtException.class, () -> jwtUtil.parseClaims("invalid-token"));
    }

    @Test
    void gettersReturnConfiguredTtlValues() {
        assertEquals(3600L, jwtUtil.getAccessTtlSeconds());
        assertEquals(7200L, jwtUtil.getRefreshTtlSeconds());
    }

    private String buildTokenWithEmployeeId(Long employeeId) {
        Key key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        Date now = new Date();
        Date exp = new Date(now.getTime() + 3600_000L);

        return Jwts.builder()
                .setSubject("alice")
                .setIssuedAt(now)
                .setExpiration(exp)
                .claim("role", "ADMIN")
                .claim("type", "access")
                .claim("employeeId", employeeId)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }
}
