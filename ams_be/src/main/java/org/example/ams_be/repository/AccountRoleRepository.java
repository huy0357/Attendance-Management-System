package org.example.ams_be.repository;

import org.example.ams_be.entity.AccountRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AccountRoleRepository extends JpaRepository<AccountRole, Long> {

    List<AccountRole> findByAccountId(Long accountId);

    Optional<AccountRole> findByAccountIdAndRoleId(Long accountId, Long roleId);

    void deleteByAccountIdAndRoleId(Long accountId, Long roleId);

    void deleteByAccountId(Long accountId);
}