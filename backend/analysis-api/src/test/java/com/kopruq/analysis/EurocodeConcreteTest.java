package com.kopruq.analysis;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Validates {@link EurocodeConcrete} against EN 1992-1-1:2004 Table 3.1's
 * own published row for C30/37 (fck=30 MPa), confirmed against
 * eurocodeapplied.com's published table on 2026-09-09: fcm=38 MPa,
 * Ecm=32837 MPa.
 */
class EurocodeConcreteTest {

    private static final double C30_37_FCK_MPA = 30;

    @Test
    void meanCompressiveStrength_matchesTheC30_37TableRow() {
        assertEquals(38.0, EurocodeConcrete.meanCompressiveStrengthMpa(C30_37_FCK_MPA), 1e-9);
    }

    @Test
    void elasticModulus_matchesTheC30_37TableRow() {
        double expectedEcmKnPerM2 = 32837 * 1000; // 32837 MPa = 32,837,000 kN/m2

        double actual = EurocodeConcrete.elasticModulusKnPerM2(C30_37_FCK_MPA);

        assertEquals(expectedEcmKnPerM2, actual, 5000); // formula vs. rounded table value, small tolerance
    }

    @Test
    void massDensity_derivedFromReinforcedConcreteUnitWeight_isAboutTwoPointFiveFive() {
        double massDensity = EurocodeConcrete.massDensityTonnesPerM3(EurocodeConcrete.UNIT_WEIGHT_REINFORCED_KN_PER_M3);

        assertEquals(2.548, massDensity, 0.001);
    }
}
