package com.kopruq.analysis;

/**
 * An isotropic material, as defined by the engineer (spec section 22 -
 * these numbers are never invented by Claude). Units follow whatever
 * force/length unit system the connected solver session is already
 * using (verified kN/m for the engineer's MIDAS Civil NX session at
 * MIDAS-P01 time) - the adapter does not change the solver's own unit
 * settings.
 *
 * @param type "CONC" | "STEEL" | "SRC" | "ALUMINUM" | "User" - MIDAS's
 *        own material-type vocabulary, kept verbatim rather than
 *        translated into a KOPRUQ-specific enum, since MIDAS-P01 only
 *        needs to pass it through.
 */
public record AnalysisMaterial(
        int id,
        String type,
        String name,
        double elasticModulus,
        double poissonRatio,
        double thermalCoefficient,
        double weightDensity,
        double massDensity) {
}
