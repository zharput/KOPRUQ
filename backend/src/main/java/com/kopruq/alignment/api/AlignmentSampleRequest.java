package com.kopruq.alignment.api;

import com.kopruq.alignment.model.Alignment;
import com.kopruq.alignment.model.StraightElement;
import com.kopruq.geometry.model.Point3D;
import com.kopruq.shared.exception.FieldViolation;
import com.kopruq.shared.validation.FieldChecks;
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
