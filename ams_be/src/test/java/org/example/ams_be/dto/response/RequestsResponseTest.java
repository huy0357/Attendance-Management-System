package org.example.ams_be.dto.response;

import org.example.ams_be.enums.RequestStatus;
import org.example.ams_be.enums.RequestType;
import org.example.ams_be.support.LombokPojoBranchAssertions;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.UnaryOperator;

class RequestsResponseTest {

    @Test
    void equalsAndHashCodeCoverGeneratedBranches() {
        LombokPojoBranchAssertions.assertEqualsAndHashCodeBranches(
                this::populated,
                RequestsResponse::new,
                populatedMismatchMutators(),
                emptyMismatchMutators(),
                dto -> new NonEqualRequestsResponse(dto)
        );
    }

    private List<UnaryOperator<RequestsResponse>> populatedMismatchMutators() {
        return List.of(
                dto -> setRequestId(dto, 2L),
                dto -> setEmployeeId(dto, 3L),
                dto -> setEmployeeName(dto, "Bob"),
                dto -> setRequestType(dto, RequestType.REMOTE),
                dto -> setTitle(dto, "WFH"),
                dto -> setReason(dto, "Family"),
                dto -> setStartDatetime(dto, LocalDateTime.of(2026, 3, 20, 8, 0)),
                dto -> setEndDatetime(dto, LocalDateTime.of(2026, 3, 20, 17, 0)),
                dto -> setStatus(dto, RequestStatus.REJECTED),
                dto -> setApproverId(dto, 5L),
                dto -> setApproverName(dto, "Manager B"),
                dto -> setDecisionNote(dto, "Rejected"),
                dto -> setSubmittedAt(dto, LocalDateTime.of(2026, 3, 19, 10, 0))
        );
    }

    private List<UnaryOperator<RequestsResponse>> emptyMismatchMutators() {
        return List.of(
                dto -> setRequestId(dto, 1L),
                dto -> setEmployeeId(dto, 2L),
                dto -> setEmployeeName(dto, "Alice"),
                dto -> setRequestType(dto, RequestType.LEAVE),
                dto -> setTitle(dto, "Annual Leave"),
                dto -> setReason(dto, "Trip"),
                dto -> setStartDatetime(dto, LocalDateTime.of(2026, 3, 19, 8, 0)),
                dto -> setEndDatetime(dto, LocalDateTime.of(2026, 3, 19, 17, 0)),
                dto -> setStatus(dto, RequestStatus.APPROVED),
                dto -> setApproverId(dto, 4L),
                dto -> setApproverName(dto, "Manager A"),
                dto -> setDecisionNote(dto, "Approved"),
                dto -> setSubmittedAt(dto, LocalDateTime.of(2026, 3, 18, 9, 0))
        );
    }

    private RequestsResponse populated() {
        RequestsResponse dto = new RequestsResponse();
        dto.setRequestId(1L);
        dto.setEmployeeId(2L);
        dto.setEmployeeName("Alice");
        dto.setRequestType(RequestType.LEAVE);
        dto.setTitle("Annual Leave");
        dto.setReason("Trip");
        dto.setStartDatetime(LocalDateTime.of(2026, 3, 19, 8, 0));
        dto.setEndDatetime(LocalDateTime.of(2026, 3, 19, 17, 0));
        dto.setStatus(RequestStatus.APPROVED);
        dto.setApproverId(4L);
        dto.setApproverName("Manager A");
        dto.setDecisionNote("Approved");
        dto.setSubmittedAt(LocalDateTime.of(2026, 3, 18, 9, 0));
        return dto;
    }

    private RequestsResponse setRequestId(RequestsResponse dto, Long value) { dto.setRequestId(value); return dto; }
    private RequestsResponse setEmployeeId(RequestsResponse dto, Long value) { dto.setEmployeeId(value); return dto; }
    private RequestsResponse setEmployeeName(RequestsResponse dto, String value) { dto.setEmployeeName(value); return dto; }
    private RequestsResponse setRequestType(RequestsResponse dto, RequestType value) { dto.setRequestType(value); return dto; }
    private RequestsResponse setTitle(RequestsResponse dto, String value) { dto.setTitle(value); return dto; }
    private RequestsResponse setReason(RequestsResponse dto, String value) { dto.setReason(value); return dto; }
    private RequestsResponse setStartDatetime(RequestsResponse dto, LocalDateTime value) { dto.setStartDatetime(value); return dto; }
    private RequestsResponse setEndDatetime(RequestsResponse dto, LocalDateTime value) { dto.setEndDatetime(value); return dto; }
    private RequestsResponse setStatus(RequestsResponse dto, RequestStatus value) { dto.setStatus(value); return dto; }
    private RequestsResponse setApproverId(RequestsResponse dto, Long value) { dto.setApproverId(value); return dto; }
    private RequestsResponse setApproverName(RequestsResponse dto, String value) { dto.setApproverName(value); return dto; }
    private RequestsResponse setDecisionNote(RequestsResponse dto, String value) { dto.setDecisionNote(value); return dto; }
    private RequestsResponse setSubmittedAt(RequestsResponse dto, LocalDateTime value) { dto.setSubmittedAt(value); return dto; }

    private static final class NonEqualRequestsResponse extends RequestsResponse {
        private NonEqualRequestsResponse(RequestsResponse base) {
            setRequestId(base.getRequestId());
            setEmployeeId(base.getEmployeeId());
            setEmployeeName(base.getEmployeeName());
            setRequestType(base.getRequestType());
            setTitle(base.getTitle());
            setReason(base.getReason());
            setStartDatetime(base.getStartDatetime());
            setEndDatetime(base.getEndDatetime());
            setStatus(base.getStatus());
            setApproverId(base.getApproverId());
            setApproverName(base.getApproverName());
            setDecisionNote(base.getDecisionNote());
            setSubmittedAt(base.getSubmittedAt());
        }

        @Override
        protected boolean canEqual(Object other) {
            return false;
        }
    }
}
