package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.Girder;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** Girder sizing columns of {@code bridge_alternative} (lengths in metres). */
@Embeddable
class GirderEmbeddable {

    @Column(name = "girder_count", nullable = false)
    private int count;
    @Column(name = "girder_depth_m", nullable = false)
    private double depthM;
    @Column(name = "girder_spacing_m", nullable = false)
    private double spacingM;

    protected GirderEmbeddable() {
    }

    static GirderEmbeddable from(Girder g) {
        GirderEmbeddable e = new GirderEmbeddable();
        e.count = g.count();
        e.depthM = g.depthM();
        e.spacingM = g.spacingM();
        return e;
    }

    Girder toDomain() {
        return new Girder(count, depthM, spacingM);
    }
}
