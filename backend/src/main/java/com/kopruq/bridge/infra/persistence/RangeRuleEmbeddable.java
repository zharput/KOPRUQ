package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.RangeRule;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * min/max/delta columns of a family rule; the column names are given by the owning entity's attribute overrides.
 * Hibernate loads an embedded value whose columns are all null as null, so every owner keeps a separate
 * {@code ..._present} flag and reads through {@link #toDomain(RangeRuleEmbeddable, boolean)}.
 */
@Embeddable
class RangeRuleEmbeddable {

    @Column(name = "min_value")
    private Double min;
    @Column(name = "max_value")
    private Double max;
    @Column(name = "delta_value")
    private Double delta;

    protected RangeRuleEmbeddable() {
    }

    static RangeRuleEmbeddable from(RangeRule rule) {
        if (rule == null) {
            return null;
        }
        RangeRuleEmbeddable e = new RangeRuleEmbeddable();
        e.min = rule.min();
        e.max = rule.max();
        e.delta = rule.delta();
        return e;
    }

    /** The rule if {@code present}; an all-null rule when the columns came back null. */
    static RangeRule toDomain(RangeRuleEmbeddable e, boolean present) {
        if (!present) {
            return null;
        }
        return e == null ? new RangeRule(null, null, null) : new RangeRule(e.min, e.max, e.delta);
    }
}
