package org.example.ams_be.enums;

public enum ExceptionStatus {
    OPEN("Open"),
    IN_PROGRESS("In Progress"),
    RESOLVED("Resolved"),
    CANCELLED("Cancelled");

    private final String displayName;

    ExceptionStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}