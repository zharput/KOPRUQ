package com.kopruq.analysis;

/**
 * An isotropic material, as defined by the engineer (spec section 22 - these numbers are never invented by
 * Claude). Units are those of this port (see the package documentation): kN, m, so stresses and moduli are in
 * kN/m2 and weights in kN/m3.
 *
 * @param kind                     what kind of material this is; the solver adapter maps it to its own vocabulary
 * @param elasticModulusKnPerM2    Young modulus, kN/m2
 * @param poissonRatio             Poisson ratio, dimensionless
 * @param thermalCoefficientPerC   coefficient of thermal expansion, 1/degC
 * @param weightDensityKnPerM3     weight density, kN/m3
 * @param massDensityTonnesPerM3   mass density, t/m3
 */
public record AnalysisMaterial(
        int id,
        MaterialKind kind,
        String name,
        double elasticModulusKnPerM2,
        double poissonRatio,
        double thermalCoefficientPerC,
        double weightDensityKnPerM3,
        double massDensityTonnesPerM3) {
}
