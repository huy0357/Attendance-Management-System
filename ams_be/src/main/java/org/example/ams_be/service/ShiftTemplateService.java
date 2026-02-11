package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.request.ShiftTemplateUpsertRequest;
import org.example.ams_be.dto.response.ShiftTemplateResponse;
import org.example.ams_be.entity.ShiftTemplate;
import org.example.ams_be.repository.ShiftTemplateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ShiftTemplateService {

    private final ShiftTemplateRepository repo;

    public List<ShiftTemplateResponse> list(Boolean active, String q) {
        // đơn giản: lấy all rồi filter (bạn có thể viết query/specification sau)
        return repo.findAll().stream()
                .filter(s -> active == null || s.getIsActive().equals(active))
                .filter(s -> q == null || q.isBlank()
                        || s.getShiftCode().toLowerCase().contains(q.toLowerCase())
                        || s.getShiftName().toLowerCase().contains(q.toLowerCase()))
                .map(this::toResponse)
                .toList();
    }

    public ShiftTemplateResponse get(Long id) {
        return toResponse(repo.findById(id).orElseThrow(() -> new RuntimeException("Shift not found")));
    }

    @Transactional
    public ShiftTemplateResponse create(ShiftTemplateUpsertRequest req) {
        if (repo.existsByShiftCode(req.getShiftCode())) {
            throw new RuntimeException("shift_code already exists");
        }
        validateTimes(req.getStartTime(), req.getEndTime(), req.getIsNightShift(), req.getBreakMinutes(), req.getMinWorkMinutes());

        ShiftTemplate entity = ShiftTemplate.builder()
                .shiftCode(req.getShiftCode().trim())
                .shiftName(req.getShiftName().trim())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .breakMinutes(req.getBreakMinutes())
                .graceInMinutes(req.getGraceInMinutes())
                .graceOutMinutes(req.getGraceOutMinutes())
                .isNightShift(req.getIsNightShift())
                .minWorkMinutes(req.getMinWorkMinutes())
                .isActive(req.getIsActive())
                .build();

        return toResponse(repo.save(entity));
    }

    @Transactional
    public ShiftTemplateResponse update(Long id, ShiftTemplateUpsertRequest req) {
        ShiftTemplate entity = repo.findById(id).orElseThrow(() -> new RuntimeException("Shift not found"));

        if (repo.existsByShiftCodeAndShiftIdNot(req.getShiftCode(), id)) {
            throw new RuntimeException("shift_code already exists");
        }
        validateTimes(req.getStartTime(), req.getEndTime(), req.getIsNightShift(), req.getBreakMinutes(), req.getMinWorkMinutes());

        entity.setShiftCode(req.getShiftCode().trim());
        entity.setShiftName(req.getShiftName().trim());
        entity.setStartTime(req.getStartTime());
        entity.setEndTime(req.getEndTime());
        entity.setBreakMinutes(req.getBreakMinutes());
        entity.setGraceInMinutes(req.getGraceInMinutes());
        entity.setGraceOutMinutes(req.getGraceOutMinutes());
        entity.setIsNightShift(req.getIsNightShift());
        entity.setMinWorkMinutes(req.getMinWorkMinutes());
        entity.setIsActive(req.getIsActive());

        return toResponse(repo.save(entity));
    }

    @Transactional
    public ShiftTemplateResponse setActive(Long id, boolean active) {
        ShiftTemplate entity = repo.findById(id).orElseThrow(() -> new RuntimeException("Shift not found"));
        entity.setIsActive(active);
        return toResponse(repo.save(entity));
    }

    private void validateTimes(LocalTime start, LocalTime end, boolean isNight, int breakMinutes, int minWorkMinutes) {
        if (!isNight) {
            if (!end.isAfter(start)) {
                throw new RuntimeException("Giờ ra phải lớn hơn giờ vào (nếu không phải ca đêm)");
            }
        } else {
            // ca đêm: cho phép end <= start (qua ngày)
            // nếu end > start vẫn ok (ví dụ ca tối nhưng không qua ngày)
        }

        long durationMinutes = calcDurationMinutes(start, end, isNight);
        if (breakMinutes > durationMinutes) {
            throw new RuntimeException("break_minutes không được lớn hơn tổng thời lượng ca");
        }
        long netMinutes = durationMinutes - breakMinutes;
        if (minWorkMinutes > netMinutes) {
            throw new RuntimeException("min_work_minutes không được lớn hơn thời lượng làm việc sau khi trừ break");
        }
    }

    private long calcDurationMinutes(LocalTime start, LocalTime end, boolean isNight) {
        if (!isNight && end.isAfter(start)) {
            return Duration.between(start, end).toMinutes();
        }
        // night shift: nếu end <= start thì qua ngày
        if (end.isAfter(start)) {
            return Duration.between(start, end).toMinutes();
        }
        return Duration.between(start, LocalTime.MAX).toMinutes() + 1 + Duration.between(LocalTime.MIN, end).toMinutes();
        // LocalTime.MAX là 23:59:59 -> +1 phút để làm tròn đơn giản; bạn có thể thay bằng logic chuẩn hơn nếu cần
    }

    private ShiftTemplateResponse toResponse(ShiftTemplate s) {
        return ShiftTemplateResponse.builder()
                .shiftId(s.getShiftId())
                .shiftCode(s.getShiftCode())
                .shiftName(s.getShiftName())
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .breakMinutes(s.getBreakMinutes())
                .graceInMinutes(s.getGraceInMinutes())
                .graceOutMinutes(s.getGraceOutMinutes())
                .isNightShift(s.getIsNightShift())
                .minWorkMinutes(s.getMinWorkMinutes())
                .isActive(s.getIsActive())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }

    @Transactional
    public void delete(Long id) {
        ShiftTemplate entity = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Shift not found"));

        entity.setIsActive(false);
        repo.save(entity);
    }

}
