package org.example.ams_be.repository;

import org.example.ams_be.entity.ShiftTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ShiftTemplateRepository extends JpaRepository<ShiftTemplate, Long> {
    Optional<ShiftTemplate> findByShiftCode(String shiftCode);
    boolean existsByShiftCode(String shiftCode);


    @Query("SELECT st FROM ShiftTemplate st WHERE st.isActive = true ORDER BY st.shiftCode")
    List<ShiftTemplate> findAllActiveShifts();

    List<ShiftTemplate> findByIsActiveTrue();

    boolean existsByShiftCodeAndShiftIdNot(String shiftCode, Long shiftId);
}
