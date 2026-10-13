package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.SweepDimension;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** One sweep dimension row (pier family and girder library dimensions); the unit is only in the label text. */
@Embeddable
class SweepDimensionEmbeddable {

    @Column(name = "dimension_key", nullable = false)
    private String key;
    @Column(name = "label", nullable = false)
    private String label;
    @Column(name = "min_value", nullable = false)
    private double min;
    @Column(name = "max_value", nullable = false)
    private double max;
    @Column(name = "delta_value", nullable = false)
    private double delta;

    protected SweepDimensionEmbeddable() {
    }

    static SweepDimensionEmbeddable from(SweepDimension d) {
        SweepDimensionEmbeddable e = new SweepDimensionEmbeddable();
        e.key = d.key();
        e.label = d.label();
        e.min = d.min();
        e.max = d.max();
        e.delta = d.delta();
        return e;
    }

    SweepDimension toDomain() {
        return new SweepDimension(key, label, min, max, delta);
    }
}
