package org.example.ams_be.enums;

public enum AttendanceStatus {
    ON_TIME("On Time"),
    LATE("Late"),
    EARLY("Early"),
    MISSING("Missing"),
    INVALID("Invalid"),
    PARTIAL("Partial"); // Có check-in nhưng thiếu check-out hoặc ngược lại

    private final String displayName;

    AttendanceStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}