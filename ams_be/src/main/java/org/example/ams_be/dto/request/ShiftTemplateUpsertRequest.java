package org.example.ams_be.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class ShiftTemplateUpsertRequest {

    @NotBlank
    @Size(max = 50)
    private String shiftCode;

    @NotBlank
    @Size(max = 255)
    private String shiftName;

    @NotNull
    private LocalTime startTime;

    @NotNull
    private LocalTime endTime;

    @NotNull @Min(0)
    private Integer breakMinutes;

    @NotNull @Min(0)
    private Integer graceInMinutes;

    @NotNull @Min(0)
    private Integer graceOutMinutes;

    @NotNull
    private Boolean isNightShift;

    @NotNull @Min(1)
    private Integer minWorkMinutes;

    @NotNull
    private Boolean isActive;
}
