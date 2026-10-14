package com.kopruq.layout.api;

import com.kopruq.alignment.model.Alignment;
import com.kopruq.alignment.model.StraightElement;
import com.kopruq.geometry.model.Point3D;
import com.kopruq.layout.model.BridgeSite;
import com.kopruq.layout.model.LayoutDesignSpace;
import com.kopruq.shared.exception.FieldViolation;
import com.kopruq.shared.validation.FieldChecks;
import java.util.ArrayList;


import java.util.List;

/**
 * LAYOUT-P01 form fields (docs/site-layout-platform-analysis.md sections
 * M, addendum Q): one straight alignment, one bridge site, zero or more
 * no-pier zones, and the span search ranges. Mirrors
 * {@code KernelStateRequest}'s pattern of centralizing the request -&gt;
 * domain-object mapping here.
 */
public record LayoutGenerationRequest(
        Double alignmentLengthM,
        Double siteStartChainageM,
        Double siteEndChainageM,
        String crossingType,
        List<NoPierZoneRequest> noPierZones,
        Double minSpanM,
        Double maxSpanM,
        Integer minSpanCount,
        Integer maxSpanCount,
        Double spanLengthStepM,
        Double c1StepM) {

    /**
     * Every numeric field is required and finite; {@code noPierZones} may be absent (no zones) but
     * a present zone must be complete. Reports all offending fields at once.
     */
    public void validate() {
        var violations = new ArrayList<FieldViolation>();
        FieldChecks.requireFinite(violations, "alignmentLengthM", alignmentLengthM);
        FieldChecks.requireFinite(violations, "siteStartChainageM", siteStartChainageM);
        FieldChecks.requireFinite(violations, "siteEndChainageM", siteEndChainageM);
        FieldChecks.requireFinite(violations, "minSpanM", minSpanM);
        FieldChecks.requireFinite(violations, "maxSpanM", maxSpanM);
        FieldChecks.requireNonNull(violations, "minSpanCount", minSpanCount);
        FieldChecks.requireNonNull(violations, "maxSpanCount", maxSpanCount);
        FieldChecks.requireFinite(violations, "spanLengthStepM", spanLengthStepM);
        FieldChecks.requireFinite(violations, "c1StepM", c1StepM);
        if (noPierZones != null) {
            for (int i = 0; i < noPierZones.size(); i++) {
                NoPierZoneRequest zone = noPierZones.get(i);
                if (zone == null) {
                    violations.add(new FieldViolation("noPierZones[" + i + "]", "must not be null"));
                } else {
                    zone.collectViolations(violations, "noPierZones[" + i + "].");
                }
            }
        }
        FieldChecks.throwIfAny(violations);
    }

    public Alignment toAlignment() {
        validate();
        return new Alignment(List.of(new StraightElement(
                new Point3D(0, 0, 0), new Point3D(alignmentLengthM, 0, 0))));
    }

    public BridgeSite toBridgeSite() {
        validate();
        return new BridgeSite("SITE-1", "Site", siteStartChainageM, siteEndChainageM, crossingType);
    }

    public LayoutDesignSpace toLayoutDesignSpace() {
        validate();
        return new LayoutDesignSpace(minSpanM, maxSpanM, minSpanCount, maxSpanCount, spanLengthStepM, c1StepM);
    }
}
