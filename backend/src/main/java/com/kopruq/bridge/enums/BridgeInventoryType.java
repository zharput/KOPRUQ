package com.kopruq.bridge.enums;

import java.util.Optional;

/** Structural type of a bridge inventory row, stored by constant name and exchanged as the {@link #label()}. */
public enum BridgeInventoryType {
    PRECAST_GIRDER("Precast Girder"),
    STEEL_COMPOSITE_GIRDER("Steel Composite Girder"),
    CANTILEVER_BRIDGE("Cantilever Bridge");

    private final String label;

    BridgeInventoryType(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    public static Optional<BridgeInventoryType> fromLabel(String label) {
        for (BridgeInventoryType value : values()) {
            if (value.label.equals(label)) {
                return Optional.of(value);
            }
        }
        return Optional.empty();
    }
}
