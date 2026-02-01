package org.example.ams_be.repository;

import org.example.ams_be.entity.Department;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

// AMS-136
@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {
    
    @Query("SELECT d FROM Department d WHERE :keyword IS NULL OR lower(d.departmentName) LIKE lower(concat('%', :keyword, '%'))")
    Page<Department> search(String keyword, Pageable pageable);
}