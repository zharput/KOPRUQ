package com.spanova.trafficloads;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class Lm1DefaultsFactoryTest {

    private final Lm1DefaultsFactory factory = new Lm1DefaultsFactory();

    @Test
    void codeDefaults_producesOneRowPerLane_upToThree() {
        Lm1Parameters lm1 = factory.codeDefaults(3);

        assertEquals(3, lm1.tandemSystem().size());
        assertEquals(3, lm1.udl().size());
    }

    @Test
    void codeDefaults_capsAtThreeRowsEvenWithMoreLanes() {
        Lm1Parameters lm1 = factory.codeDefaults(5);

        assertEquals(3, lm1.tandemSystem().size());
        assertEquals(3, lm1.udl().size());
    }

    @Test
    void codeDefaults_leavesCharacteristicValuesUnconfirmed() {
        Lm1Parameters lm1 = factory.codeDefaults(3);

        for (LaneFactor factorRow : lm1.tandemSystem()) {
            assertNull(factorRow.characteristicValue().value(), "EN 1991-2 Table 4.2 values must not be invented");
            assertNull(factorRow.effectiveValue());
        }
    }

    @Test
    void codeDefaults_prefillsTheConfirmedAdjustmentFactorOfOne() {
        Lm1Parameters lm1 = factory.codeDefaults(3);

        for (LaneFactor factorRow : lm1.tandemSystem()) {
            assertEquals(1.0, factorRow.adjustmentFactor().value(), 1e-9);
            assertEquals(ParameterProvenance.NATIONAL_ANNEX, factorRow.adjustmentFactor().provenance());
        }
        assertTrue(lm1.remainingAreaUdl().adjustmentFactor().value() == 1.0);
    }
}
