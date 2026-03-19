package org.example.ams_be.enums;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

class EnumCoverageTest {

    @Test
    void attendanceCalcStatusValuesAreStable() {
        assertEquals(AttendanceCalcStatus.PRESENT, AttendanceCalcStatus.valueOf("PRESENT"));
        assertEquals(6, AttendanceCalcStatus.values().length);
    }

    @Test
    void requestStatusValuesAreStable() {
        assertEquals(RequestStatus.APPROVED, RequestStatus.valueOf("APPROVED"));
        assertArrayEquals(
                new RequestStatus[]{RequestStatus.DRAFT, RequestStatus.SUBMITTED, RequestStatus.APPROVED, RequestStatus.REJECTED, RequestStatus.CANCELLED},
                RequestStatus.values()
        );
    }

    @Test
    void requestTypeValuesAreStable() {
        assertEquals(RequestType.OVERTIME, RequestType.valueOf("OVERTIME"));
        assertArrayEquals(
                new RequestType[]{RequestType.LEAVE, RequestType.OVERTIME, RequestType.REMOTE, RequestType.LATE_EARLY},
                RequestType.values()
        );
    }
}
