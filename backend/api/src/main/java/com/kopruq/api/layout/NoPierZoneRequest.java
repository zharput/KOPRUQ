package com.kopruq.api.layout;

import com.kopruq.api.error.FieldChecks;
import com.kopruq.api.error.FieldViolation;
import java.util.ArrayList;
import java.util.List;

import com.kopruq.constraints.NoPierZone;

/** One no-pier zone from the Site & Layout form. */
public record NoPierZoneRequest(String id, Double startChainageM, Double endChainageM, String description) {

    /** Collects this zone's violations under the given field prefix (e.g. {@code noPierZones[0].}). */
    void collectViolations(List<FieldViolation> violations, String prefix) {
        FieldChecks.requireFinite(violations, prefix + "startChainageM", startChainageM);
        FieldChecks.requireFinite(violations, prefix + "endChainageM", endChainageM);
    }

    public NoPierZone toNoPierZone() {
        var violations = new ArrayList<FieldViolation>();
        collectViolations(violations, "");
        FieldChecks.throwIfAny(violations);
        return new NoPierZone(id, startChainageM, endChainageM, description);
    }
}
