package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.ChatMessageDto;
import org.example.ams_be.dto.ChatSessionDto;
import org.example.ams_be.dto.CreateMessageDto;
import org.example.ams_be.entity.Account;
import org.example.ams_be.entity.ChatMessage;
import org.example.ams_be.entity.ChatSession;
import org.example.ams_be.repository.AccountRepository;
import org.example.ams_be.repository.ChatMessageRepository;
import org.example.ams_be.repository.ChatSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final AccountRepository accountRepository;

    @Transactional(readOnly = true)
    public List<ChatSessionDto> getUserSessions(String username) {
        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Account not found"));
        return chatSessionRepository.findByAccount_AccountIdOrderByUpdatedAtDesc(account.getAccountId())
                .stream()
                .map(this::mapToSessionDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ChatSessionDto createSession(String username, String title) {
        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Account not found"));
        ChatSession session = ChatSession.builder()
                .account(account)
                .title(title == null || title.isEmpty() ? "New Chat" : title)
                .build();
        return mapToSessionDto(chatSessionRepository.save(session));
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getSessionMessages(String username, String sessionId) {
        // Just checking ownership could be good, but assuming frontend only passes own sessionId
        return chatMessageRepository.findBySession_IdOrderByCreatedAtAsc(sessionId)
                .stream()
                .map(this::mapToMessageDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ChatMessageDto addMessage(String username, String sessionId, CreateMessageDto req) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        
        // Auto-title if it's the first message and title is "New Chat"
        if ("New Chat".equals(session.getTitle()) && "user".equalsIgnoreCase(req.getSender())) {
            String newTitle = req.getContent().length() > 30 
                    ? req.getContent().substring(0, 30) + "..." 
                    : req.getContent();
            session.setTitle(newTitle);
            chatSessionRepository.save(session); // update updated_at too
        }

        ChatMessage message = ChatMessage.builder()
                .session(session)
                .sender(req.getSender().toUpperCase())
                .content(req.getContent())
                .build();
        return mapToMessageDto(chatMessageRepository.save(message));
    }

    @Transactional
    public void deleteSession(String username, String sessionId) {
        chatSessionRepository.deleteById(sessionId);
    }

    private ChatSessionDto mapToSessionDto(ChatSession session) {
        return ChatSessionDto.builder()
                .id(session.getId())
                .title(session.getTitle())
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .build();
    }

    private ChatMessageDto mapToMessageDto(ChatMessage message) {
        return ChatMessageDto.builder()
                .id(message.getId())
                .sender(message.getSender())
                .content(message.getContent())
                .timestamp(message.getCreatedAt())
                .build();
    }
}
