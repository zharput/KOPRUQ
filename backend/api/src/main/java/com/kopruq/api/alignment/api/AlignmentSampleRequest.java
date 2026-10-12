package com.kopruq.api.alignment.api;

import com.kopruq.alignment.Alignment;
import com.kopruq.alignment.StraightElement;
import com.kopruq.api.error.FieldChecks;
import com.kopruq.api.error.FieldViolation;
import com.kopruq.spatialcore.Point3D;
import java.util.ArrayList;
import java.util.List;

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

    /** The straight alignment this request describes (call {@link #validate()} first). */
    public Alignment toAlignment() {
        var start = new Point3D(startXM, startYM, 0);
        var end = new Point3D(endXM, endYM, 0);
        return new Alignment(List.of(new StraightElement(start, end)));
    }
}
