package org.example.ams_be.dto.request;

import org.example.ams_be.enums.RequestStatus;

public class RequestsApprovalRequest {
    public Long approverId; 
    public RequestStatus status; 
    public String decisionNote; 
}
