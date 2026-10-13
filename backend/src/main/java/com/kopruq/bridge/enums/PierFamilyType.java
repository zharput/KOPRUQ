package com.kopruq.bridge.enums;

import java.util.Optional;

/** Pier family cross-section type; the stored values include the legacy H_TYPE and WALL. Stored and exchanged by constant name. */
public enum PierFamilyType {
    RECTANGULAR,
    CIRCULAR,
    OVAL,
    BOX,
    H_SECTION,
    H_TYPE,
    WALL;

    /** Exact match on the constant name; empty for anything else. */
    public static Optional<PierFamilyType> fromValue(String value) {
        for (PierFamilyType e : values()) {
            if (e.name().equals(value)) {
                return Optional.of(e);
            }
        }
        return Optional.empty();
    }
}
