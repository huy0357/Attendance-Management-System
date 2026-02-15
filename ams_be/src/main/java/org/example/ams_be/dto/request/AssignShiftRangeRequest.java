package org.example.ams_be.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class AssignShiftRangeRequest {

    @NotNull
    private Long employeeId;

    @NotNull
    private Long shiftId;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    @NotNull
    private String scheduleSource; // "MANUAL" | "IMPORT"

    private String note;

    @NotNull
    private Boolean overwrite; // true: replace lịch ngày đó (nếu bạn muốn)
}
