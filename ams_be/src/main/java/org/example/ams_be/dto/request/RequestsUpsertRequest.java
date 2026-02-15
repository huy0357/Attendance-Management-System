package org.example.ams_be.dto.request;

import java.time.LocalDateTime;

import org.example.ams_be.enums.RequestType;

public class RequestsUpsertRequest {
    public Long employeeId; // ID người tạo
    public RequestType requestType;
    public String title;
    public String reason;
    public LocalDateTime startDatetime;
    public LocalDateTime endDatetime;
}
