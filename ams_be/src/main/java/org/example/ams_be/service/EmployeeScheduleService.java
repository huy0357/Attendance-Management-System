package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.request.AssignShiftRangeRequest;
import org.example.ams_be.dto.response.EmployeeScheduleDayResponse;
import org.example.ams_be.entity.EmployeeSchedule;
import org.example.ams_be.entity.ShiftTemplate;
import org.example.ams_be.repository.EmployeeScheduleRepository;
import org.example.ams_be.repository.ShiftTemplateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class EmployeeScheduleService {

    private final EmployeeScheduleRepository scheduleRepo;
    private final ShiftTemplateRepository shiftRepo;

    @Transactional
    public Map<String, Object> assignRange(AssignShiftRangeRequest req) {

        if (req.getEndDate().isBefore(req.getStartDate())) {
            throw new RuntimeException("endDate phải >= startDate");
        }

        ShiftTemplate newShift = shiftRepo.findById(req.getShiftId())
                .orElseThrow(() -> new RuntimeException("Shift not found"));

        // Lấy lịch hiện tại trong khoảng mở rộng để bắt ca đêm “spill” sang ngày kế
        LocalDate from = req.getStartDate().minusDays(1);
        LocalDate to = req.getEndDate().plusDays(1);

        List<EmployeeSchedule> existing = scheduleRepo.findByEmployeeIdAndWorkDateBetween(
                req.getEmployeeId(), from, to
        );

        // Group theo work_date để check nhanh
        Map<LocalDate, List<EmployeeSchedule>> byDate = new HashMap<>();
        for (EmployeeSchedule s : existing) {
            byDate.computeIfAbsent(s.getWorkDate(), k -> new ArrayList<>()).add(s);
        }

        int created = 0;
        int updated = 0;

        LocalDate d = req.getStartDate();
        while (!d.isAfter(req.getEndDate())) {

            // 1) Nếu muốn “mỗi ngày 1 ca” thì bạn dùng findByEmployeeIdAndWorkDate để replace/update.
            // 2) Nếu cho nhiều ca/ngày, thì check conflict với tất cả ca trong ngày (và ca đêm ngày trước).
            // Mình implement conflict theo thời gian.

            // Các schedule cần so với ngày d:
            // - ca trong ngày d
            // - ca ngày d-1 (để bắt ca đêm 22:00-06:00 đè lên sáng ngày d)
            List<EmployeeSchedule> toCheck = new ArrayList<>();
            toCheck.addAll(byDate.getOrDefault(d, List.of()));
            toCheck.addAll(byDate.getOrDefault(d.minusDays(1), List.of()));

            // Interval của ca mới tại ngày d
            Interval newInterval = toInterval(d, newShift.getStartTime(), newShift.getEndTime());

            // Check overlap
            for (EmployeeSchedule ex : toCheck) {
                ShiftTemplate exShift = shiftRepo.findById(ex.getShiftId())
                        .orElseThrow(() -> new RuntimeException("Shift not found: " + ex.getShiftId()));

                Interval exInterval = toInterval(ex.getWorkDate(), exShift.getStartTime(), exShift.getEndTime());

                // Nếu ex là ca của ngày d-1 nhưng không spill qua d thì không cần xét
                // spill nghĩa là exInterval end > start of day d
                if (ex.getWorkDate().isEqual(d.minusDays(1))) {
                    LocalDateTime dayStart = d.atStartOfDay();
                    if (!exInterval.end.isAfter(dayStart)) continue;
                }

                if (overlap(newInterval, exInterval)) {
                    throw new RuntimeException("Conflict lịch: employee_id=" + req.getEmployeeId()
                            + " bị trùng giờ vào ngày " + d + " với schedule_id=" + ex.getScheduleId());
                }
            }

            // Nếu overwrite=true và bạn muốn “mỗi ngày 1 ca”:
            // Optional<EmployeeSchedule> sameDay = scheduleRepo.findByEmployeeIdAndWorkDate(req.getEmployeeId(), d);
            // if (sameDay.isPresent()) { update ...; updated++; } else { insert ...; created++; }

            // Ở đây mình làm kiểu: nếu overwrite=true và đã có record đúng ngày -> update record đầu tiên của ngày đó
            if (Boolean.TRUE.equals(req.getOverwrite()) && !byDate.getOrDefault(d, List.of()).isEmpty()) {
                EmployeeSchedule target = byDate.get(d).get(0);
                target.setShiftId(req.getShiftId());
                target.setScheduleSource(EmployeeSchedule.ScheduleSource.valueOf(req.getScheduleSource()));
                target.setNote(req.getNote());
                scheduleRepo.save(target);
                updated++;
            } else {
                EmployeeSchedule createdEntity = EmployeeSchedule.builder()
                        .employeeId(req.getEmployeeId())
                        .workDate(d)
                        .shiftId(req.getShiftId())
                        .scheduleSource(EmployeeSchedule.ScheduleSource.valueOf(req.getScheduleSource()))
                        .note(req.getNote())
                        .build();
                EmployeeSchedule saved = scheduleRepo.save(createdEntity);

                // cập nhật map để các ngày sau check đúng
                byDate.computeIfAbsent(d, k -> new ArrayList<>()).add(saved);
                created++;
            }

            d = d.plusDays(1);
        }

        return Map.of(
                "employeeId", req.getEmployeeId(),
                "shiftId", req.getShiftId(),
                "startDate", req.getStartDate().toString(),
                "endDate", req.getEndDate().toString(),
                "created", created,
                "updated", updated
        );
    }

    private static class Interval {
        LocalDateTime start;
        LocalDateTime end;
        Interval(LocalDateTime s, LocalDateTime e) { start = s; end = e; }
    }

    // Chuyển shift (start/end time) thành interval datetime theo work_date
    // Nếu end <= start => hiểu là qua ngày (+1 day)
    private Interval toInterval(LocalDate workDate, LocalTime start, LocalTime end) {
        LocalDateTime s = workDate.atTime(start);
        LocalDateTime e = workDate.atTime(end);
        if (!e.isAfter(s)) {
            e = e.plusDays(1);
        }
        return new Interval(s, e);
    }

    private boolean overlap(Interval a, Interval b) {
        return a.start.isBefore(b.end) && b.start.isBefore(a.end);
    }

    public List<EmployeeScheduleDayResponse> getEmployeeScheduleByDay(Long employeeId, LocalDate date) {
        return scheduleRepo.findDaySchedules(employeeId, date);
    }
}
