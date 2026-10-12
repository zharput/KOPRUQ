package com.kopruq.bridgecore;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** BACKEND-REMEDIATION Faz 6: Bridge / DesignSpace construction rules (finiteness; Bridge also not negative). */
class BridgeInvariantTest {

    @Test
    void bridge_acceptsZeroAndPositive_noPositivityRuleIsInvented() {
        assertDoesNotThrow(() -> new Bridge("Zero", 0, 0));
        assertDoesNotThrow(() -> new Bridge("Impossible", 100, 0));
        assertDoesNotThrow(() -> new Bridge(null, 210, 13.8));
    }

    @Test
    void bridge_rejectsNegativeAndNonFiniteLengths() {
        assertThrows(IllegalArgumentException.class, () -> new Bridge("b", -1, 10));
        assertThrows(IllegalArgumentException.class, () -> new Bridge("b", 10, -0.5));
        for (double bad : new double[] {Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY}) {
            assertThrows(IllegalArgumentException.class, () -> new Bridge("b", bad, 10));
            assertThrows(IllegalArgumentException.class, () -> new Bridge("b", 10, bad));
        }
    }

    @Test
    void designSpace_acceptsEveryFiniteValue_includingNegativeAndInverted() {
        // Only finiteness is enforced at construction; ranges are validated where they are used.
        assertDoesNotThrow(() -> new DesignSpace(50, 10, 8, 4, -1, -2, 0, 0, 0, 0, 0, 0, 0, 0, 0.1));
    }

    @Test
    void designSpace_rejectsNonFiniteOptionalFieldsToo() {
        assertThrows(IllegalArgumentException.class,
                () -> new DesignSpace(30, 45, 4, 8, Double.NaN, 0, 1.8, 2.5, 0, 0, 0, 0, 0, 0, 0.1));
        assertThrows(IllegalArgumentException.class,
                () -> new DesignSpace(30, 45, 4, 8, 0, 0, 1.8, 2.5, 0, 0, 0, Double.POSITIVE_INFINITY, 0, 0, 0.1));
        assertThrows(IllegalArgumentException.class,
                () -> new DesignSpace(30, 45, 4, 8, 0, 0, 1.8, 2.5, 0, 0, 0, 0, 0, Double.NaN, 0.1));
    }
}
