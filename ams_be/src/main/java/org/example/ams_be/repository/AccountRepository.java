package org.example.ams_be.repository;

import org.example.ams_be.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {
    boolean existsByUsername(String username);
    boolean existsByEmployeeId(Long employeeId);
    Optional<Account> findByUsername(String username);
}
