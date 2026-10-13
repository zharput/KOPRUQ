package com.kopruq.bridge.enums;

import java.util.Optional;

/** Foundation family type (named to stay apart from {@link FoundationType}). Stored and exchanged by constant name. */
public enum FoundationFamilyType {
    SHALLOW,
    PILED;

    /** Exact match on the constant name; empty for anything else. */
    public static Optional<FoundationFamilyType> fromValue(String value) {
        for (FoundationFamilyType e : values()) {
            if (e.name().equals(value)) {
                return Optional.of(e);
            }
        }
        return Optional.empty();
    }
}
