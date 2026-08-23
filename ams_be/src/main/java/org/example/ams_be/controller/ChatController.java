package org.example.ams_be.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.ChatMessageDto;
import org.example.ams_be.dto.ChatSessionDto;
import org.example.ams_be.dto.CreateMessageDto;
import org.example.ams_be.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat/sessions")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping
    public ResponseEntity<List<ChatSessionDto>> getSessions(Authentication auth) {
        return ResponseEntity.ok(chatService.getUserSessions(auth.getName()));
    }

    @PostMapping
    public ResponseEntity<ChatSessionDto> createSession(Authentication auth, @RequestParam(required = false) String title) {
        return ResponseEntity.ok(chatService.createSession(auth.getName(), title));
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<ChatMessageDto>> getMessages(Authentication auth, @PathVariable String id) {
        return ResponseEntity.ok(chatService.getSessionMessages(auth.getName(), id));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<ChatMessageDto> addMessage(Authentication auth, @PathVariable String id, @Valid @RequestBody CreateMessageDto req) {
        return ResponseEntity.ok(chatService.addMessage(auth.getName(), id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSession(Authentication auth, @PathVariable String id) {
        chatService.deleteSession(auth.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
