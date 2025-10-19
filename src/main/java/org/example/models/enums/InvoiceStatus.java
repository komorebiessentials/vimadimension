package org.example.models.enums;

public enum InvoiceStatus {
    DRAFT("Draft"),
    SENT("Sent"),
    VIEWED("Viewed"),
    PAID("Paid"),
    OVERDUE("Overdue"),
    CANCELLED("Cancelled");

    private final String displayName;

    InvoiceStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
