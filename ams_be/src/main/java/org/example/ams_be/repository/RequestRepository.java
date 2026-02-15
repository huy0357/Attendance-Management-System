package org.example.ams_be.repository;

import java.util.List;

import org.example.ams_be.entity.Requests;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RequestRepository extends JpaRepository<Requests, Long> {

    List<Requests> findByEmployee_EmployeeIdOrderByCreatedAtDesc(Long employeeId);

    List<Requests> findByStatus(org.example.ams_be.enums.RequestStatus status);
}
