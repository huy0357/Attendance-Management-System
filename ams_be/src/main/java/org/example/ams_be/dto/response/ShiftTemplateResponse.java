package org.example.ams_be.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class ShiftTemplateResponse {
    private Long shiftId;
    private String shiftCode;
    private String shiftName;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer breakMinutes;
    private Integer graceInMinutes;
    private Integer graceOutMinutes;
    private Boolean isNightShift;
    private Integer minWorkMinutes;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
