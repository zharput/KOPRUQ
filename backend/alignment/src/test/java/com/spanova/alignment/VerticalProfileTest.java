package com.spanova.alignment;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class VerticalProfileTest {

    private static final double EPS = 1e-9;

    @Test
    void elevationAt_twoPvisNoCurve_interpolatesLinearly() {
        VerticalProfile profile = new VerticalProfile("Ground", List.of(
                new Pvi(0, 100, 0),
                new Pvi(100, 105, 0)));

        assertEquals(100, profile.elevationAt(0), EPS);
        assertEquals(102.5, profile.elevationAt(50), EPS);
        assertEquals(105, profile.elevationAt(100), EPS);
    }

    @Test
    void elevationAt_beyondLastPvi_extendsFinalGrade() {
        VerticalProfile profile = new VerticalProfile("Ground", List.of(
                new Pvi(0, 100, 0),
                new Pvi(100, 105, 0)));

        assertEquals(110, profile.elevationAt(200), EPS);
    }

    @Test
    void elevationAt_parabolicVerticalCurve_matchesStandardFormula() {
        // g1 = +5%, g2 = -5%, curve length 40 m centered on PVI at chainage 100, elevation 105.
        VerticalProfile profile = new VerticalProfile("Design", List.of(
                new Pvi(0, 100, 0),
                new Pvi(100, 105, 40),
                new Pvi(200, 100, 0)));

        // BVC = chainage 80, elevation 105 - 0.05*20 = 104.
        assertEquals(104, profile.elevationAt(80), EPS);
        // EVC = chainage 120, elevation 105 - 0.05*20 = 104 (symmetric curve).
        assertEquals(104, profile.elevationAt(120), EPS);
        // At the PVI itself (chainage 100): E = 104 + g1*20 + ((g2-g1)/(2L))*20^2 = 104.5.
        assertEquals(104.5, profile.elevationAt(100), EPS);
        // Outside the curve zone, plain grade interpolation applies.
        assertEquals(102.5, profile.elevationAt(50), EPS);
        assertEquals(102.5, profile.elevationAt(150), EPS);
    }

    @Test
    void constructor_rejectsFewerThanTwoPvis() {
        assertThrows(IllegalArgumentException.class, () -> new VerticalProfile("Bad", List.of(new Pvi(0, 100, 0))));
    }
}
