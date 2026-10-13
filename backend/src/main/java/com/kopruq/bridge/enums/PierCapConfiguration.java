package com.kopruq.bridge.enums;

import java.util.Optional;

/** Pier configuration a pier cap family is compatible with. Stored and exchanged by constant name. */
public enum PierCapConfiguration {
    SINGLE_COLUMN,
    TWO_COLUMNS;

    /** Exact match on the constant name; empty for anything else. */
    public static Optional<PierCapConfiguration> fromValue(String value) {
        for (PierCapConfiguration e : values()) {
            if (e.name().equals(value)) {
                return Optional.of(e);
            }
        }
        return Optional.empty();
    }
}
