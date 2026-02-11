package org.example.ams_be.repository;

import org.example.ams_be.entity.ShiftTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShiftTemplateRepository extends JpaRepository<ShiftTemplate, Long> {
    Optional<ShiftTemplate> findByShiftCode(String shiftCode);
    boolean existsByShiftCode(String shiftCode);
    boolean existsByShiftCodeAndShiftIdNot(String shiftCode, Long shiftId);
}
