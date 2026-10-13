package com.kopruq.bridge.enums;

import java.util.Optional;

/** Kind of a site constraint attached to a bridge definition. Stored and exchanged by constant name. */
public enum ConstraintKind {
    ROAD_RAILWAY,
    RIVER,
    CLEARANCE,
    UTILITY,
    ENVIRONMENT,
    OTHER;

    /** Exact match on the constant name; empty for anything else. */
    public static Optional<ConstraintKind> fromValue(String value) {
        for (ConstraintKind e : values()) {
            if (e.name().equals(value)) {
                return Optional.of(e);
            }
        }
        return Optional.empty();
    }
}
