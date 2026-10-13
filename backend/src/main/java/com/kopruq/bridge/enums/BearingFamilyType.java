package com.kopruq.bridge.enums;

import java.util.Optional;

/** Bearing family type. Stored and exchanged by constant name. */
public enum BearingFamilyType {
    ELASTOMERIC;

    /** Exact match on the constant name; empty for anything else. */
    public static Optional<BearingFamilyType> fromValue(String value) {
        for (BearingFamilyType e : values()) {
            if (e.name().equals(value)) {
                return Optional.of(e);
            }
        }
        return Optional.empty();
    }
}
