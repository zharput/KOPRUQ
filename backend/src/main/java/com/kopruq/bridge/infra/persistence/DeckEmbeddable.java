package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.Deck;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** Deck column of {@code bridge_alternative}; a null slab thickness means "no deck sized" (the embeddable is null). */
@Embeddable
class DeckEmbeddable {

    @Column(name = "deck_slab_thickness_m")
    private Double slabThicknessM;

    protected DeckEmbeddable() {
    }

    static DeckEmbeddable from(Deck d) {
        DeckEmbeddable e = new DeckEmbeddable();
        e.slabThicknessM = d.slabThicknessM();
        return e;
    }

    Deck toDomain() {
        return new Deck(slabThicknessM);
    }
}
