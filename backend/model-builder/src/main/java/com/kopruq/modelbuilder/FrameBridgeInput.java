package com.kopruq.modelbuilder;

import java.util.List;

/**
 * The input of the portal-frame bridge model: a continuous deck over several spans, portal-frame piers (two
 * rectangular columns + cap beam) and a bearing at every support. All lengths in metres, {@code concreteFckMpa} in
 * MPa, {@code sdlKnPerM} in kN/m, bearing translational stiffnesses in kN/m and rotational ones in kN*m/rad.
 *
 * <p>The constructor enforces the input domain only (finite numbers, dimensions greater than 0, one pier height per
 * intermediate pier); no engineering limit is applied. {@code sdlKnPerM} and the bearing stiffnesses must be finite
 * but have deliberately no sign or range rule.
 *
 * @param spanLengthsM  span arrangement, at least one span
 * @param pierHeightsM  one entry per intermediate pier ({@code spanLengthsM.size() - 1}); column height from the fixed
 *                      base up to the cap beam / bearing level
 * @throws IllegalArgumentException if an invariant above is violated
 */
public record FrameBridgeInput(
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

    public FrameBridgeInput {
        if (spanLengthsM == null || spanLengthsM.isEmpty()) {
            throw new IllegalArgumentException("spanLengthsM must contain at least one span");
        }
        if (pierHeightsM == null) {
            throw new IllegalArgumentException("pierHeightsM is required");
        }
        for (int i = 0; i < spanLengthsM.size(); i++) {
            requirePositive("spanLengthsM[" + i + "]", spanLengthsM.get(i));
        }
        for (int i = 0; i < pierHeightsM.size(); i++) {
            requirePositive("pierHeightsM[" + i + "]", pierHeightsM.get(i));
        }
        if (pierHeightsM.size() != spanLengthsM.size() - 1) {
            throw new IllegalArgumentException("pierHeightsM must have one entry per intermediate pier (spanCount - 1 = "
                    + (spanLengthsM.size() - 1) + "), got " + pierHeightsM.size());
        }
        requirePositive("deckWidthM", deckWidthM);
        requirePositive("deckThicknessM", deckThicknessM);
        requirePositive("columnLongitudinalM", columnLongitudinalM);
        requirePositive("columnTransverseM", columnTransverseM);
        requirePositive("columnSpacingTransverseM", columnSpacingTransverseM);
        requirePositive("capBeamWidthM", capBeamWidthM);
        requirePositive("capBeamDepthM", capBeamDepthM);
        requirePositive("concreteFckMpa", concreteFckMpa);
        requireFinite("sdlKnPerM", sdlKnPerM);
        requireFinite("bearingKx", bearingKx);
        requireFinite("bearingKy", bearingKy);
        requireFinite("bearingKz", bearingKz);
        requireFinite("bearingKrx", bearingKrx);
        requireFinite("bearingKry", bearingKry);
        requireFinite("bearingKrz", bearingKrz);
        spanLengthsM = List.copyOf(spanLengthsM);
        pierHeightsM = List.copyOf(pierHeightsM);
    }

    private static void requireFinite(String field, Double value) {
        if (value == null || !Double.isFinite(value)) {
            throw new IllegalArgumentException(field + " must be a finite number");
        }
    }

    private static void requirePositive(String field, Double value) {
        requireFinite(field, value);
        if (value <= 0) {
            throw new IllegalArgumentException(field + " must be greater than 0");
        }
    }
}
