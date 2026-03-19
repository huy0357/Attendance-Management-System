package org.example.ams_be.entity;

import org.example.ams_be.enums.RequestStatus;
import org.example.ams_be.enums.RequestType;
import org.example.ams_be.support.LombokPojoBranchAssertions;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.function.UnaryOperator;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RequestsTest {

    @Test
    void equalsAndHashCodeCoverGeneratedBranches() {
        LombokPojoBranchAssertions.assertEqualsAndHashCodeBranches(
                this::populated,
                this::empty,
                populatedMismatchMutators(),
                emptyMismatchMutators(),
                request -> new NonEqualRequests(request)
        );
    }

    @Test
    void onCreateSetsTimestampsAndDefaultsStatusWhenNull() {
        Requests request = empty();
        request.onCreate();

        assertNotNull(request.getCreatedAt());
        assertNotNull(request.getUpdatedAt());
        assertNotNull(request.getSubmittedAt());
        assertTrue(request.getStatus() == RequestStatus.DRAFT);
    }

    @Test
    void onCreateKeepsExistingStatusWhenPresent() {
        Requests request = empty();
        request.setStatus(RequestStatus.APPROVED);

        request.onCreate();

        assertTrue(request.getStatus() == RequestStatus.APPROVED);
    }

    @Test
    void onUpdateRefreshesUpdatedAt() {
        Requests request = populated();
        request.setUpdatedAt(null);

        request.onUpdate();

        assertNotNull(request.getUpdatedAt());
    }

    private List<UnaryOperator<Requests>> populatedMismatchMutators() {
        return List.of(
                dto -> setRequestId(dto, 2L),
                dto -> setEmployee(dto, employee(2L, "EMP-2")),
                dto -> setRequestType(dto, RequestType.REMOTE),
                dto -> setTitle(dto, "WFH"),
                dto -> setReason(dto, "Family"),
                dto -> setStartDatetime(dto, LocalDateTime.of(2026, 3, 20, 8, 0)),
                dto -> setEndDatetime(dto, LocalDateTime.of(2026, 3, 20, 17, 0)),
                dto -> setStatus(dto, RequestStatus.REJECTED),
                dto -> setApprover(dto, employee(5L, "MGR-2")),
                dto -> setSubmittedAt(dto, LocalDateTime.of(2026, 3, 19, 10, 0)),
                dto -> setDecisionNote(dto, "Rejected"),
                dto -> setCreatedAt(dto, LocalDateTime.of(2026, 3, 19, 10, 5)),
                dto -> setUpdatedAt(dto, LocalDateTime.of(2026, 3, 19, 10, 10))
        );
    }

    private List<UnaryOperator<Requests>> emptyMismatchMutators() {
        return List.of(
                dto -> setRequestId(dto, 1L),
                dto -> setEmployee(dto, employee(1L, "EMP-1")),
                dto -> setRequestType(dto, RequestType.LEAVE),
                dto -> setTitle(dto, "Annual Leave"),
                dto -> setReason(dto, "Trip"),
                dto -> setStartDatetime(dto, LocalDateTime.of(2026, 3, 19, 8, 0)),
                dto -> setEndDatetime(dto, LocalDateTime.of(2026, 3, 19, 17, 0)),
                dto -> setStatus(dto, RequestStatus.APPROVED),
                dto -> setApprover(dto, employee(4L, "MGR-1")),
                dto -> setSubmittedAt(dto, LocalDateTime.of(2026, 3, 18, 9, 0)),
                dto -> setDecisionNote(dto, "Approved"),
                dto -> setCreatedAt(dto, LocalDateTime.of(2026, 3, 18, 9, 5)),
                dto -> setUpdatedAt(dto, LocalDateTime.of(2026, 3, 18, 9, 10))
        );
    }

    private Requests populated() {
        Requests request = new Requests();
        request.setRequestId(1L);
        request.setEmployee(employee(1L, "EMP-1"));
        request.setRequestType(RequestType.LEAVE);
        request.setTitle("Annual Leave");
        request.setReason("Trip");
        request.setStartDatetime(LocalDateTime.of(2026, 3, 19, 8, 0));
        request.setEndDatetime(LocalDateTime.of(2026, 3, 19, 17, 0));
        request.setStatus(RequestStatus.APPROVED);
        request.setApprover(employee(4L, "MGR-1"));
        request.setSubmittedAt(LocalDateTime.of(2026, 3, 18, 9, 0));
        request.setDecisionNote("Approved");
        request.setCreatedAt(LocalDateTime.of(2026, 3, 18, 9, 5));
        request.setUpdatedAt(LocalDateTime.of(2026, 3, 18, 9, 10));
        return request;
    }

    private Requests empty() {
        Requests request = new Requests();
        request.setStatus(null);
        return request;
    }

    private Employee employee(Long id, String code) {
        return Employee.builder()
                .employeeId(id)
                .employeeCode(code)
                .fullName(code)
                .dob(LocalDate.of(2000, 1, 1))
                .gender("M")
                .phone("0123")
                .email(code + "@company.com")
                .status("ACTIVE")
                .departmentId(10L)
                .positionId(20L)
                .managerId(30L)
                .hireDate(LocalDate.of(2025, 1, 1))
                .terminatedDate(LocalDate.of(2026, 3, 19))
                .createdAt(LocalDateTime.of(2025, 1, 1, 8, 0))
                .build();
    }

    private Requests setRequestId(Requests dto, Long value) { dto.setRequestId(value); return dto; }
    private Requests setEmployee(Requests dto, Employee value) { dto.setEmployee(value); return dto; }
    private Requests setRequestType(Requests dto, RequestType value) { dto.setRequestType(value); return dto; }
    private Requests setTitle(Requests dto, String value) { dto.setTitle(value); return dto; }
    private Requests setReason(Requests dto, String value) { dto.setReason(value); return dto; }
    private Requests setStartDatetime(Requests dto, LocalDateTime value) { dto.setStartDatetime(value); return dto; }
    private Requests setEndDatetime(Requests dto, LocalDateTime value) { dto.setEndDatetime(value); return dto; }
    private Requests setStatus(Requests dto, RequestStatus value) { dto.setStatus(value); return dto; }
    private Requests setApprover(Requests dto, Employee value) { dto.setApprover(value); return dto; }
    private Requests setSubmittedAt(Requests dto, LocalDateTime value) { dto.setSubmittedAt(value); return dto; }
    private Requests setDecisionNote(Requests dto, String value) { dto.setDecisionNote(value); return dto; }
    private Requests setCreatedAt(Requests dto, LocalDateTime value) { dto.setCreatedAt(value); return dto; }
    private Requests setUpdatedAt(Requests dto, LocalDateTime value) { dto.setUpdatedAt(value); return dto; }

    private static final class NonEqualRequests extends Requests {
        private NonEqualRequests(Requests base) {
            setRequestId(base.getRequestId());
            setEmployee(base.getEmployee());
            setRequestType(base.getRequestType());
            setTitle(base.getTitle());
            setReason(base.getReason());
            setStartDatetime(base.getStartDatetime());
            setEndDatetime(base.getEndDatetime());
            setStatus(base.getStatus());
            setApprover(base.getApprover());
            setSubmittedAt(base.getSubmittedAt());
            setDecisionNote(base.getDecisionNote());
            setCreatedAt(base.getCreatedAt());
            setUpdatedAt(base.getUpdatedAt());
        }

        @Override
        protected boolean canEqual(Object other) {
            return false;
        }
    }
}
