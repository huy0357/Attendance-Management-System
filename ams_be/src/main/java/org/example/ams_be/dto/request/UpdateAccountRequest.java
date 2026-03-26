package org.example.ams_be.dto.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateAccountRequest {
    private String username;
    private Long roleId;
    private Boolean isActive;
}