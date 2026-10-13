package com.kopruq.bridge.model;

/** A min/max/delta triple of a family generation rule. Each part may be absent; the unit comes from the owning field. */
public record RangeRule(Double min, Double max, Double delta) {

    public RangeRule {
        SectionInvariants.finiteOrNull("min", min);
        SectionInvariants.finiteOrNull("max", max);
        SectionInvariants.finiteOrNull("delta", delta);
    }
}
