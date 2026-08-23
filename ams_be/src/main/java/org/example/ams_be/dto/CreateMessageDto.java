package org.example.ams_be.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateMessageDto {
    @NotBlank
    private String sender; // "user" or "ai"
    @NotBlank
    private String content;
}
