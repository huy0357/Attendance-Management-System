package org.example.ams_be.enums;

public enum ExceptionType {
    NO_CHECK_IN_NO_LEAVE("No check-in, no leave request"),
    FREQUENT_LATE("Frequent late arrivals"),
    ANTI_SPOOFING_TRIGGERED("Anti-spoofing system triggered"),
    MISSING_CHECK_OUT("Missing check-out record"),
    PERSONAL_LEAVE("Personal leave request"),
    SICK_LEAVE("Sick leave request"),
    UNAUTHORIZED_ABSENCE("Unauthorized absence"),
    DUPLICATE_CHECKIN("Duplicate check-in detected"),
    SYSTEM_ERROR("System error during attendance"),
    MANUAL_ADJUSTMENT("Manual attendance adjustment needed");

    private final String displayName;

    ExceptionType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}