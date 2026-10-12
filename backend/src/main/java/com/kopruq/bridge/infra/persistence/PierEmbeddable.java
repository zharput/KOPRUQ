package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.Pier;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * Pier columns of {@code bridge_alternative}; all null means "no pier sized" (the embeddable is null).
 * {@code pier_type} is the free-text label of the model, stored as is.
 */
@Embeddable
class PierEmbeddable {

    @Column(name = "pier_diameter_m")
    private Double diameterM;
    @Column(name = "pier_height_m")
    private Double heightM;
    @Column(name = "pier_type")
    private String pierType;

    protected PierEmbeddable() {
    }

    static PierEmbeddable from(Pier p) {
        PierEmbeddable e = new PierEmbeddable();
        e.diameterM = p.diameterM();
        e.heightM = p.heightM();
        e.pierType = p.pierType();
        return e;
    }

    Pier toDomain() {
        if (diameterM == null || heightM == null) {
            throw new IllegalStateException("Stored pier needs both diameter and height");
        }
        return new Pier(diameterM, heightM, pierType);
    }
}
