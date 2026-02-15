package org.example.ams_be.repository;

import org.example.ams_be.dto.response.EmployeeScheduleDayResponse;
import org.example.ams_be.entity.EmployeeSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EmployeeScheduleRepository extends JpaRepository<EmployeeSchedule, Long> {

    List<EmployeeSchedule> findByEmployeeIdAndWorkDateBetween(
            Long employeeId, LocalDate from, LocalDate to
    );

    Optional<EmployeeSchedule> findByEmployeeIdAndWorkDate(Long employeeId, LocalDate workDate);

    @Query("""
        select new org.example.ams_be.dto.response.EmployeeScheduleDayResponse(
            es.scheduleId,
            es.employeeId,
            es.workDate,
            st.shiftId,
            st.shiftCode,
            st.shiftName,
            st.startTime,
            st.endTime,
            st.breakMinutes,
            st.isNightShift,
            es.scheduleSource,
            es.note
        )
        from EmployeeSchedule es
        join ShiftTemplate st on st.shiftId = es.shiftId
        where es.employeeId = :employeeId
          and es.workDate = :workDate
        order by st.startTime asc
    """)
    List<EmployeeScheduleDayResponse> findDaySchedules(
            @Param("employeeId") Long employeeId,
            @Param("workDate") LocalDate workDate
    );
}
