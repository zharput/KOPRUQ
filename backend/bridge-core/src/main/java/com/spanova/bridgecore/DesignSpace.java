package com.spanova.bridgecore;

/**
 * The ranges of design variables the engineer is willing to consider
 * (spec section 9, Generative Mode - spec section 6.B). All lengths are
 * in meters (SI).
 *
 * <p>Every range below is named explicitly in spec section 9. Note that
 * section 9 writes "Range" after each superstructure item (Girder Count
 * Range, Girder Spacing Range, Girder Depth Range, Slab Thickness
 * Range) but not after the substructure items (Pier Height, Pier
 * Diameter) - this is treated as a wording simplification rather than a
 * deliberate distinction, since a DesignSpace's entire purpose is to
 * hold ranges (spec section 6.B's own example gives "Pier Diameter =
 * 1.80-2.80 m" as a range). Flag this reading to the engineer if it's
 * wrong.
 *
 * @param girderDepthStepM step used by the generative engine (P03) when
 *        it enumerates girder depths within [minGirderDepthM,
 *        maxGirderDepthM]. Not named anywhere in the master spec - it
 *        is a combinatorial-search resolution, not an engineering
 *        quantity, so it does not need engineer approval the way a
 *        structural limit would. Documented here rather than hardcoded
 *        in generative-engine so it stays auditable and adjustable.
 *        Defaults to 0.10 via {@link #withDefaults(DesignSpace)}
 *        style construction - callers should set it explicitly.
 */
public record DesignSpace(
        double minSpanM, double maxSpanM,
        int minGirderCount, int maxGirderCount,
        double minGirderSpacingM, double maxGirderSpacingM,
        double minGirderDepthM, double maxGirderDepthM,
        double minSlabThicknessM, double maxSlabThicknessM,
        double minPierDiameterM, double maxPierDiameterM,
        double minPierHeightM, double maxPierHeightM,
        double girderDepthStepM) {

    public static final double DEFAULT_GIRDER_DEPTH_STEP_M = 0.10;
}
