package com.kopruq.bridge.enums;

import java.util.Optional;

/**
 * Where a stored traffic-LM1 parameter value came from. Mirrors the frontend union exactly; stored and exchanged by
 * constant name. (The {@code loads} domain has its own enum of the same name; the bridge domain does not import it.)
 */
public enum ParameterProvenance {
    CODE_DEFAULT,
    NATIONAL_ANNEX,
    PROJECT_OVERRIDE;

    /** Exact match on the constant name; empty for anything else. */
    public static Optional<ParameterProvenance> fromValue(String value) {
        for (ParameterProvenance e : values()) {
            if (e.name().equals(value)) {
                return Optional.of(e);
            }
        }
        return Optional.empty();
    }
}
