package org.example.ams_be.dto.request;

import jakarta.validation.constraints.NotBlank;

public class LogoutRequest {
    // Logout dùng refresh token để revoke
    @NotBlank
    private String refreshToken;

    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
}
