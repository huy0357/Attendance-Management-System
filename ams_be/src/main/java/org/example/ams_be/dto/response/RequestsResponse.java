package org.example.ams_be.dto.response;

import lombok.Data;
import org.example.ams_be.enums.RequestStatus;
import org.example.ams_be.enums.RequestType;
import java.time.LocalDateTime;

@Data
public class RequestsResponse {
    public Long requestId;
    public Long employeeId;
    public String employeeName; 
    public RequestType requestType;
    public String title;
    public String reason;
    public LocalDateTime startDatetime;
    public LocalDateTime endDatetime;
    public RequestStatus status;
    public Long approverId;
    public String approverName;
    public String decisionNote;
    public LocalDateTime submittedAt;
}
