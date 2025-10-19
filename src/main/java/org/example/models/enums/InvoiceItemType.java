package org.example.models.enums;

public enum InvoiceItemType {
    FIXED_PRICE("Fixed Price"),
    TIME_BASED("Time Based"),
    EXPENSE("Expense"),
    DISCOUNT("Discount");

    private final String displayName;

    InvoiceItemType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}

