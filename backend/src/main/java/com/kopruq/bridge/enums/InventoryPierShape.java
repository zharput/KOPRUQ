package com.kopruq.bridge.enums;

import java.util.Optional;

/** Pier shape of a bridge inventory row, stored by constant name and exchanged as the {@link #label()}. */
public enum InventoryPierShape {
    RECTANGULAR("Rectangular"),
    CIRCULAR("Circular"),
    BOX("Box"),
    OVAL("Oval");

    private final String label;

    InventoryPierShape(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    public static Optional<InventoryPierShape> fromLabel(String label) {
        for (InventoryPierShape value : values()) {
            if (value.label.equals(label)) {
                return Optional.of(value);
            }
        }
        return Optional.empty();
    }
}
