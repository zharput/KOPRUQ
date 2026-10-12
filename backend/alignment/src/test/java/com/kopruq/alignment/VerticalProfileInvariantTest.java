package com.kopruq.alignment;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** BACKEND-REMEDIATION Faz 7b: PVI order / finiteness invariants and {@link VerticalProfile#covers(double)}. */
class VerticalProfileInvariantTest {

    @Test
    void chainages_mustBeStrictlyIncreasing() {
        assertThrows(IllegalArgumentException.class, () -> new VerticalProfile("p", List.of(new Pvi(0, 100, 0), new Pvi(0, 105, 0))));
        assertThrows(IllegalArgumentException.class, () -> new VerticalProfile("p",
                List.of(new Pvi(0, 100, 0), new Pvi(100, 105, 0), new Pvi(50, 100, 0))));
    }

    @Test
    void nonFiniteValues_areRejected() {
        for (double bad : new double[] {Double.NaN, Double.POSITIVE_INFINITY}) {
            assertThrows(IllegalArgumentException.class, () -> new VerticalProfile("p", List.of(new Pvi(bad, 100, 0), new Pvi(100, 105, 0))));
            assertThrows(IllegalArgumentException.class, () -> new VerticalProfile("p", List.of(new Pvi(0, bad, 0), new Pvi(100, 105, 0))));
            assertThrows(IllegalArgumentException.class, () -> new VerticalProfile("p", List.of(new Pvi(0, 100, bad), new Pvi(100, 105, 0))));
        }
    }

    @Test
    void covers_isInclusiveOfFirstAndLastPvi_andElevationAtStillExtrapolates() {
        VerticalProfile p = new VerticalProfile("p", List.of(new Pvi(10, 100, 0), new Pvi(110, 105, 0)));
        assertTrue(p.covers(10));
        assertTrue(p.covers(60));
        assertTrue(p.covers(110));
        assertFalse(p.covers(9.999));
        assertFalse(p.covers(110.001));
        assertEquals(110, p.elevationAt(210), 1e-9, "elevationAt itself is unchanged and still extends the end grade");
    }

    @Test
    void validProfiles_stillConstruct() {
        new VerticalProfile("p", List.of(new Pvi(0, 100, 0), new Pvi(100, 105, 40), new Pvi(200, 100, 0)));
    }
}
