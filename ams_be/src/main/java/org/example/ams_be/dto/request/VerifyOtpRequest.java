package org.example.ams_be.dto.request;

import lombok.Data;

@Data
public class VerifyOtpRequest {
    private String email;
    private String otp;
}