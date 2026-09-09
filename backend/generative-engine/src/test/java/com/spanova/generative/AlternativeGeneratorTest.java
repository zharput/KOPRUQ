package com.spanova.generative;

import com.spanova.bridgecore.Bridge;
import com.spanova.bridgecore.DesignSpace;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNull;

class AlternativeGeneratorTest {

    // Spec section 20's own P03 worked example.
    private static Bridge specExampleBridge() {
        return new Bridge("P03-example", 210, 13.80);
    }

    private static DesignSpace specExampleDesignSpace() {
        return new DesignSpace(
                30, 45,
                4, 8,
                0, 0,
                1.8, 2.5,
                0, 0,
                0, 0,
                0, 0,
                0.1);
    }

    @Test
    void generate_specExample_producesOnlyAlternativesWithinTheRequestedRanges() {
        var alternatives = new AlternativeGenerator().generate(specExampleBridge(), specExampleDesignSpace());

        assertTrue(!alternatives.isEmpty());

        for (var alt : alternatives) {
            double spanLengthM = alt.spanLayout().spans().get(0).lengthM();
            assertTrue(spanLengthM >= 30 - 1e-6 && spanLengthM <= 45 + 1e-6);
            assertTrue(alt.girder().count() >= 4 && alt.girder().count() <= 8);
            assertTrue(alt.girder().depthM() >= 1.8 - 1e-6 && alt.girder().depthM() <= 2.5 + 1e-6);
            assertEquals(210, alt.spanLayout().totalLengthM(), 1e-3);

            // Deck/Pier/Foundation are explicitly out of P03's scope.
            assertNull(alt.deck());
            assertNull(alt.pier());
            assertNull(alt.foundation());
        }
    }

    @Test
    void generate_specExample_findsExpectedSpanCounts() {
        // 210 / N must fall within [30, 45]:
        //   N=5 -> 42 m, N=6 -> 35 m, N=7 -> 30 m are the only integers that fit.
        var alternatives = new AlternativeGenerator().generate(specExampleBridge(), specExampleDesignSpace());

        Set<Integer> spanCountsFound = alternatives.stream()
                .map(a -> a.spanLayout().spanCount())
                .collect(Collectors.toCollection(java.util.TreeSet::new));

        assertEquals(Set.of(5, 6, 7), spanCountsFound);
    }

    @Test
    void generate_specExample_producesExpectedCombinationCount() {
        // 3 span counts (5,6,7) x 5 girder counts (4..8) x 8 girder depths (1.8..2.5 step 0.1)
        var alternatives = new AlternativeGenerator().generate(specExampleBridge(), specExampleDesignSpace());

        assertEquals(3 * 5 * 8, alternatives.size());
    }

    @Test
    void generate_returnsEmpty_whenNoSpanCountFitsTheRange() {
        var bridge = new Bridge("Impossible", 100, 0);
        var designSpace = new DesignSpace(40, 41, 4, 4, 0, 0, 2.0, 2.0, 0, 0, 0, 0, 0, 0, 0.1);

        List<?> alternatives = new AlternativeGenerator().generate(bridge, designSpace);

        assertTrue(alternatives.isEmpty());
    }

    @Test
    void generate_throws_whenSpanRangeIsInvalid() {
        var bridge = specExampleBridge();
        var invalidSpace = new DesignSpace(50, 10, 4, 8, 0, 0, 1.8, 2.5, 0, 0, 0, 0, 0, 0, 0.1);

        assertThrows(IllegalArgumentException.class,
                () -> new AlternativeGenerator().generate(bridge, invalidSpace));
    }

    @Test
    void generate_throws_whenTotalLengthIsNotPositive() {
        var bridge = new Bridge("Zero", 0, 0);

        assertThrows(IllegalArgumentException.class,
                () -> new AlternativeGenerator().generate(bridge, specExampleDesignSpace()));
    }
}
