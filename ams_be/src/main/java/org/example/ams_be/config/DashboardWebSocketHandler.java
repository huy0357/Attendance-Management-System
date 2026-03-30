package org.example.ams_be.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
@Slf4j
public class DashboardWebSocketHandler extends TextWebSocketHandler {

    private final Map<String, WebSocketSession> activeSessions = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> userSubscriptions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String userId = extractUserIdFromSession(session);

        activeSessions.put(userId, session);
        userSubscriptions.putIfAbsent(userId, ConcurrentHashMap.newKeySet());

        log.info("WebSocket connection established for user: {}", userId);

        WebSocketMessage welcomeMessage = WebSocketMessage.builder()
                .action("connected")
                .topic("system")
                .timestamp(LocalDateTime.now())
                .data("WebSocket connection established")
                .build();

        sendMessageToUser(userId, welcomeMessage);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String userId = extractUserIdFromSession(session);

        try {
            WebSocketMessage wsMessage = objectMapper.readValue(message.getPayload(), WebSocketMessage.class);

            if (wsMessage.getAction() == null || wsMessage.getAction().isBlank()) {
                sendErrorMessage(session, "Action is required");
                return;
            }

            switch (wsMessage.getAction()) {
                case "subscribe" -> handleSubscribe(userId, wsMessage);
                case "unsubscribe" -> handleUnsubscribe(userId, wsMessage);
                case "ping" -> handlePing(userId);
                default -> {
                    log.warn("Unknown WebSocket action: {} from user: {}", wsMessage.getAction(), userId);
                    sendErrorMessage(session, "Unknown action: " + wsMessage.getAction());
                }
            }
        } catch (Exception e) {
            log.error("Error handling WebSocket message from user: {}", userId, e);
            sendErrorMessage(session, "Invalid message format");
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String userId = extractUserIdFromSession(session);
        activeSessions.remove(userId);
        userSubscriptions.remove(userId);

        log.info("WebSocket connection closed for user: {}, status: {}", userId, status);
    }

    private void handleSubscribe(String userId, WebSocketMessage message) {
        if (message.getTopic() == null || message.getTopic().isBlank()) {
            WebSocketSession session = activeSessions.get(userId);
            if (session != null) {
                sendErrorMessage(session, "Topic is required for subscribe");
            }
            return;
        }

        Set<String> subscriptions = userSubscriptions.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet());
        subscriptions.add(message.getTopic());

        log.info("User {} subscribed to topic: {}", userId, message.getTopic());

        WebSocketMessage confirmMessage = WebSocketMessage.builder()
                .action("subscribed")
                .topic(message.getTopic())
                .timestamp(LocalDateTime.now())
                .data("Successfully subscribed to " + message.getTopic())
                .build();

        sendMessageToUser(userId, confirmMessage);
    }

    private void handleUnsubscribe(String userId, WebSocketMessage message) {
        if (message.getTopic() == null || message.getTopic().isBlank()) {
            return;
        }

        Set<String> subscriptions = userSubscriptions.get(userId);
        if (subscriptions != null) {
            subscriptions.remove(message.getTopic());
            log.info("User {} unsubscribed from topic: {}", userId, message.getTopic());
        }
    }

    private void handlePing(String userId) {
        WebSocketMessage pongMessage = WebSocketMessage.builder()
                .action("pong")
                .topic("system")
                .timestamp(LocalDateTime.now())
                .data("pong")
                .build();

        sendMessageToUser(userId, pongMessage);
    }

    public void broadcastToTopic(String topic, Object data) {
        WebSocketMessage message = WebSocketMessage.builder()
                .action("broadcast")
                .topic(topic)
                .timestamp(LocalDateTime.now())
                .data(data)
                .build();

        userSubscriptions.entrySet().stream()
                .filter(entry -> entry.getValue().contains(topic))
                .forEach(entry -> sendMessageToUser(entry.getKey(), message));
    }

    private void sendMessageToUser(String userId, WebSocketMessage message) {
        WebSocketSession session = activeSessions.get(userId);
        if (session != null && session.isOpen()) {
            try {
                String messageJson = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(messageJson));
            } catch (Exception e) {
                log.error("Error sending WebSocket message to user: {}", userId, e);
            }
        }
    }

    private String extractUserIdFromSession(WebSocketSession session) {
        Object userId = session.getAttributes().get("userId");
        if (userId != null) {
            return userId.toString();
        }
        return "anonymous_" + session.getId();
    }

    private void sendErrorMessage(WebSocketSession session, String error) {
        try {
            WebSocketMessage errorMessage = WebSocketMessage.builder()
                    .action("error")
                    .topic("system")
                    .timestamp(LocalDateTime.now())
                    .data(error)
                    .build();

            String messageJson = objectMapper.writeValueAsString(errorMessage);
            session.sendMessage(new TextMessage(messageJson));
        } catch (Exception e) {
            log.error("Error sending error message", e);
        }
    }

    public static class WebSocketMessage {
        private String action;
        private String topic;
        private LocalDateTime timestamp;
        private Object data;

        public static WebSocketMessageBuilder builder() {
            return new WebSocketMessageBuilder();
        }

        public String getAction() {
            return action;
        }

        public void setAction(String action) {
            this.action = action;
        }

        public String getTopic() {
            return topic;
        }

        public void setTopic(String topic) {
            this.topic = topic;
        }

        public LocalDateTime getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(LocalDateTime timestamp) {
            this.timestamp = timestamp;
        }

        public Object getData() {
            return data;
        }

        public void setData(Object data) {
            this.data = data;
        }

        public static class WebSocketMessageBuilder {
            private String action;
            private String topic;
            private LocalDateTime timestamp;
            private Object data;

            public WebSocketMessageBuilder action(String action) {
                this.action = action;
                return this;
            }

            public WebSocketMessageBuilder topic(String topic) {
                this.topic = topic;
                return this;
            }

            public WebSocketMessageBuilder timestamp(LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            public WebSocketMessageBuilder data(Object data) {
                this.data = data;
                return this;
            }

            public WebSocketMessage build() {
                WebSocketMessage message = new WebSocketMessage();
                message.action = this.action;
                message.topic = this.topic;
                message.timestamp = this.timestamp;
                message.data = this.data;
                return message;
            }
        }
    }
}