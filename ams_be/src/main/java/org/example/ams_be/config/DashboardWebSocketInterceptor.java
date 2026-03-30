package org.example.ams_be.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Component
@Slf4j
public class DashboardWebSocketInterceptor implements HandshakeInterceptor {

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {

        String token = extractTokenFromRequest(request);

        if (token != null) {
            String userId = validateTokenAndGetUserId(token);
            if (userId != null) {
                attributes.put("userId", userId);
                log.info("WebSocket handshake successful for user: {}", userId);
                return true;
            }
        }

        String anonymousUserId = "anonymous_" + System.currentTimeMillis();
        attributes.put("userId", anonymousUserId);
        log.warn("WebSocket connection allowed without valid token. Assigned userId={}", anonymousUserId);
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        if (exception != null) {
            log.error("WebSocket handshake failed", exception);
        }
    }

    private String extractTokenFromRequest(ServerHttpRequest request) {
        String query = request.getURI().getQuery();
        if (query != null && query.contains("token=")) {
            String[] params = query.split("&");
            for (String param : params) {
                if (param.startsWith("token=")) {
                    return param.substring("token=".length());
                }
            }
        }

        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring("Bearer ".length());
        }

        return null;
    }

    private String validateTokenAndGetUserId(String token) {
        if ("test-token".equals(token)) {
            return "test-user";
        }
        return null;
    }
}