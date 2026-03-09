package org.example.ams_be.dto.request;

import java.time.LocalDateTime;

import org.example.ams_be.enums.RequestType;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.Data;

@Data
public class RequestsUpsertRequest {
    public Long employeeId; // ID người tạo
    public RequestType requestType;
    public String title;
    public String reason;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    public LocalDateTime startDatetime;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    public LocalDateTime endDatetime;
}
