package com.kopruq.bridge.enums;

import java.util.Optional;

/** Pier cap family type. Stored and exchanged by constant name. */
public enum PierCapType {
    RECTANGULAR,
    T_CAP;

    /** Exact match on the constant name; empty for anything else. */
    public static Optional<PierCapType> fromValue(String value) {
        for (PierCapType e : values()) {
            if (e.name().equals(value)) {
                return Optional.of(e);
            }
        }
        return Optional.empty();
    }
}
