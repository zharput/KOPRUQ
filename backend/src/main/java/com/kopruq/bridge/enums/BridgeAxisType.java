package com.kopruq.bridge.enums;

import java.util.Optional;

/** Kind of a bridge axis in a bridge definition. Stored and exchanged by constant name. */
public enum BridgeAxisType {
    ABUTMENT,
    PIER;

    /** Exact match on the constant name; empty for anything else. */
    public static Optional<BridgeAxisType> fromValue(String value) {
        for (BridgeAxisType e : values()) {
            if (e.name().equals(value)) {
                return Optional.of(e);
            }
        }
        return Optional.empty();
    }
}
