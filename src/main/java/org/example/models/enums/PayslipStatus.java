package org.example.models.enums;

public enum PayslipStatus {
    DRAFT("Draft"),
    GENERATED("Generated"),
    APPROVED("Approved"),
    PAID("Paid"),
    CANCELLED("Cancelled");

    private final String displayName;

    PayslipStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
