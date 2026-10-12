package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.enums.FoundationType;
import com.kopruq.bridge.model.Foundation;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

/**
 * Foundation columns of {@code bridge_alternative}; a null type means "no foundation sized" (the embeddable is null).
 * Pile columns are stored as given; no PILE/SPREAD consistency rule is applied here (none exists in the model).
 */
@Embeddable
class FoundationEmbeddable {

    @Enumerated(EnumType.STRING)
    @Column(name = "foundation_type", length = 32)
    private FoundationType type;
    @Column(name = "foundation_pile_count")
    private Integer pileCount;
    @Column(name = "foundation_pile_diameter_m")
    private Double pileDiameterM;

    protected FoundationEmbeddable() {
    }

    static FoundationEmbeddable from(Foundation f) {
        if (f.type() == null) {
            throw new IllegalArgumentException("A foundation without a type cannot be stored");
        }
        FoundationEmbeddable e = new FoundationEmbeddable();
        e.type = f.type();
        e.pileCount = f.pileCount();
        e.pileDiameterM = f.pileDiameterM();
        return e;
    }

    Foundation toDomain() {
        return new Foundation(type, pileCount, pileDiameterM);
    }
}
