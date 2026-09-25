package com.kopruq.analysis;

/**
 * EN 1992-1-1:2004 Table 3.1 concrete properties, computed from the
 * characteristic cylinder compressive strength fck - the engineer
 * directed this project to derive material properties "per EN" once the
 * concrete class was confirmed (C30/37, 2026-09-09); nothing here is
 * invented. Source formulas, EN 1992-1-1:2004:
 *
 * <pre>
 * fcm  = fck + 8                     (Table 3.1)
 * Ecm  = 22 * (fcm / 10)^0.3   GPa    (Table 3.1)
 * </pre>
 *
 * <p>Cross-checked against the code's own published C30/37 row
 * (fck=30 MPa -&gt; fcm=38 MPa, Ecm=32837 MPa) - see
 * {@code EurocodeConcreteTest}.
 */
public final class EurocodeConcrete {

    /** EN 1992-1-1 3.1.3(4): Poisson's ratio for uncracked concrete. */
    public static final double POISSON_RATIO_UNCRACKED = 0.2;

    /** EN 1992-1-1 3.1.3(5): linear thermal expansion coefficient, per degree C. */
    public static final double THERMAL_COEFFICIENT_PER_C = 1.0e-5;

    /** EN 1991-1-1 Table A.1: normal-weight reinforced/prestressed concrete, kN/m3. */
    public static final double UNIT_WEIGHT_REINFORCED_KN_PER_M3 = 25.0;

    private static final double STANDARD_GRAVITY_M_PER_S2 = 9.81;

    private EurocodeConcrete() {
    }

    /** @param fckMpa characteristic cylinder compressive strength, MPa (e.g. 30 for C30/37) */
    public static double meanCompressiveStrengthMpa(double fckMpa) {
        return fckMpa + 8;
    }

    /**
     * Secant modulus of elasticity Ecm.
     *
     * @param fckMpa characteristic cylinder compressive strength, MPa
     * @return Ecm in kN/m2, matching this project's SI (m, kN) convention
     */
    public static double elasticModulusKnPerM2(double fckMpa) {
        double fcmMpa = meanCompressiveStrengthMpa(fckMpa);
        double ecmGpa = 22 * Math.pow(fcmMpa / 10.0, 0.3);
        return ecmGpa * 1_000_000; // 1 GPa = 1e6 kN/m2
    }

    /** Mass density derived from unit weight (weight = mass * g), in t/m3. */
    public static double massDensityTonnesPerM3(double unitWeightKnPerM3) {
        return unitWeightKnPerM3 / STANDARD_GRAVITY_M_PER_S2;
    }
}
