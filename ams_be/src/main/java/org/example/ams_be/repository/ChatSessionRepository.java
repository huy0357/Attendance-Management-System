package org.example.ams_be.repository;

import org.example.ams_be.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, String> {
    List<ChatSession> findByAccount_AccountIdOrderByUpdatedAtDesc(Long accountId);
}
