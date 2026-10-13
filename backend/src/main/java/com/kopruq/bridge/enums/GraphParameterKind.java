package com.kopruq.bridge.enums;

import java.util.Optional;

/**
 * Discriminator of a graph node parameter value (the frontend union is number | boolean | string | number[]).
 * Stored and exchanged by constant name.
 */
public enum GraphParameterKind {
    NUMBER,
    BOOLEAN,
    STRING,
    NUMBER_ARRAY;

    /** Exact match on the constant name; empty for anything else. */
    public static Optional<GraphParameterKind> fromValue(String value) {
        for (GraphParameterKind e : values()) {
            if (e.name().equals(value)) {
                return Optional.of(e);
            }
        }
        return Optional.empty();
    }
}
