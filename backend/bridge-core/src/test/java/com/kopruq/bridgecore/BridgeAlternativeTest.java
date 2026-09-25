package com.kopruq.bridgecore;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class BridgeAlternativeTest {

    private static BridgeAlternative makeAlternative() {
        var layout = new SpanLayout(List.of(new Span(40), new Span(40)));
        var girder = new Girder(6, 2.1, 2.3);
        return new BridgeAlternative(
                java.util.UUID.randomUUID(), layout, girder,
                new Deck(0.25), new Pier(2.2, 12, ""), new Foundation(FoundationType.PILE, 8, 1.2));
    }

    @Test
    void eachAlternative_hasAUniqueId() {
        var a = makeAlternative();
        var b = makeAlternative();

        assertNotEquals(a.id(), b.id());
    }

    @Test
    void canBeFullyConstructed_withoutAnyMidasOrExternalType() {
        // This is P01's stated success criterion (spec section 20,
        // adapted for architecture amendment v2): "A bridge can be
        // represented independently of MIDAS."
        var alt = makeAlternative();

        assertEquals(2, alt.spanLayout().spanCount());
        assertEquals(80, alt.spanLayout().totalLengthM(), 1e-6);
        assertEquals(6, alt.girder().count());
        assertEquals(FoundationType.PILE, alt.foundation().type());
    }

    @Test
    void of_leavesDeckPierFoundationNull_forTheP03GenerationScope() {
        var layout = new SpanLayout(List.of(new Span(40)));
        var girder = new Girder(6, 2.1, 2.3);

        var alt = BridgeAlternative.of(layout, girder);

        assertNotNull(alt.id());
        assertNull(alt.deck());
        assertNull(alt.pier());
        assertNull(alt.foundation());
    }
}
