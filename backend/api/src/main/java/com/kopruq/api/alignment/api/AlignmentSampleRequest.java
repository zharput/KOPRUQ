package com.kopruq.api.alignment;

import com.kopruq.api.error.FieldChecks;
import com.kopruq.api.error.FieldViolation;
import java.util.ArrayList;

/** A single straight alignment segment (TERRAIN-P01 scope - matches {@code Alignment}'s current straight-only support). */
public record AlignmentSampleRequest(
        Double startXM, Double startYM,
        Double endXM, Double endYM,
        Double stepM) {

    /** Every field is required and finite ({@code stepM <= 0} keeps meaning "choose a step automatically"). */
    public void validate() {
        var violations = new ArrayList<FieldViolation>();
        FieldChecks.requireFinite(violations, "startXM", startXM);
        FieldChecks.requireFinite(violations, "startYM", startYM);
        FieldChecks.requireFinite(violations, "endXM", endXM);
        FieldChecks.requireFinite(violations, "endYM", endYM);
        FieldChecks.requireFinite(violations, "stepM", stepM);
        FieldChecks.throwIfAny(violations);
    }
}
