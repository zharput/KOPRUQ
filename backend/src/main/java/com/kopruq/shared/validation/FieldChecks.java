package com.kopruq.shared.validation;

import java.util.List;
import com.kopruq.shared.exception.FieldViolation;
import com.kopruq.shared.exception.InvalidRequestException;

/**
 * Small hand-written request checks (no Bean Validation dependency): each method
 * records a {@link FieldViolation} instead of throwing, so a request DTO can
 * report every offending field at once via {@link #throwIfAny(List)}.
 * Only input-domain rules live here (present, finite) - never engineering limits.
 */
public final class FieldChecks {

    private FieldChecks() {
    }

    /** The value must be present and a finite number. */
    public static void requireFinite(List<FieldViolation> violations, String field, Double value) {
        if (value == null) {
            violations.add(new FieldViolation(field, "is required"));
        } else if (!Double.isFinite(value)) {
            violations.add(new FieldViolation(field, "must be a finite number"));
        }
    }

    /** The value must be present. */
    public static void requireNonNull(List<FieldViolation> violations, String field, Object value) {
        if (value == null) {
            violations.add(new FieldViolation(field, "is required"));
        }
    }

    public static void throwIfAny(List<FieldViolation> violations) {
        if (!violations.isEmpty()) {
            throw new InvalidRequestException(violations);
        }
    }
}
