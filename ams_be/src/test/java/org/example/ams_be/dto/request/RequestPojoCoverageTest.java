package org.example.ams_be.dto.request;

import org.junit.jupiter.api.Test;

import static org.example.ams_be.support.ModelCoverageAssertions.assertPojoCoverage;

class RequestPojoCoverageTest {

    @Test
    void requestClassesCoverConstructorsAccessorsAndObjectMethods() {
        assertPojoCoverage(AssignShiftRangeRequest.class);
        assertPojoCoverage(CreateAccountRequest.class);
        assertPojoCoverage(EmployeeRequest.class);
        assertPojoCoverage(LoginRequest.class);
        assertPojoCoverage(LogoutRequest.class);
        assertPojoCoverage(PageRequestDto.class);
        assertPojoCoverage(RefreshRequest.class);
        assertPojoCoverage(RequestsApprovalRequest.class);
        assertPojoCoverage(RequestsUpsertRequest.class);
        assertPojoCoverage(ShiftTemplateUpsertRequest.class);
        assertPojoCoverage(UpdateAccountRequest.class);
    }
}
