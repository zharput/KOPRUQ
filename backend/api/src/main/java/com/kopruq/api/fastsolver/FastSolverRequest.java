package com.kopruq.api.fastsolver;

import java.util.List;

/**
 * KOPRUQ Fast Solver form fields (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md
 * addendum P) - the engineer's own worked test case (2026-09-10):
 * a 5-span frame bridge, portal-frame piers (2 rectangular columns + cap
 * beam each), elastomeric bearings at every support, fixed column bases.
 *
 * @param spanLengthsM span arrangement, e.g. [30, 40, 50, 40, 25] m
 * @param pierHeightsM one entry per intermediate pier - length must be
 *        {@code spanLengthsM.size() - 1}; each pier's column height from
 *        its fixed base up to the cap beam/bearing level
 * @param concreteFckMpa characteristic cylinder compressive strength,
 *        MPa (e.g. 30 for C30/37) - drives Ecm via {@link com.kopruq.analysis.EurocodeConcrete}
 *        (EN 1992-1-1 Table 3.1); never invented, always engineer-supplied
 */
public record FastSolverRequest(
        List<Double> spanLengthsM,
        double deckWidthM,
        double deckThicknessM,
        double sdlKnPerM,
        List<Double> pierHeightsM,
        double columnLongitudinalM,
        double columnTransverseM,
        double columnSpacingTransverseM,
        double capBeamWidthM,
        double capBeamDepthM,
        double concreteFckMpa,
        double bearingKx, double bearingKy, double bearingKz,
        double bearingKrx, double bearingKry, double bearingKrz) {
}
