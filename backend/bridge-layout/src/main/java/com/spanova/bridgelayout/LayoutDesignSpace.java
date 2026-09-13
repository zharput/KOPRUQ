package com.spanova.bridgelayout;

/**
 * The ranges the layout engine searches within (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md
 * section C) - the layout-generation analogue of {@code bridge-core}'s
 * {@code DesignSpace}. All lengths in meters (SI).
 *
 * <p>Only span-length/span-count/candidate-abutment-position ranges are
 * modelled so far - LAYOUT-P01's scope (girder/pier/superstructure-type
 * design space stays with {@code bridge-core}'s existing
 * {@code DesignSpace}, consumed later by {@code StructuralAlternativeBuilder}).
 *
 * @param spanLengthStepM combinatorial-search resolution for the uniform
 *        span length within [minSpanM, maxSpanM] - not an engineering
 *        quantity (same reasoning as {@code DesignSpace.girderDepthStepM}).
 * @param c1StepM combinatorial-search resolution for candidate abutment
 *        (C1) chainage positions within the {@link BridgeSite} - also
 *        not an engineering quantity.
 */
public record LayoutDesignSpace(
        double minSpanM, double maxSpanM,
        int minSpanCount, int maxSpanCount,
        double spanLengthStepM, double c1StepM) {

    public static final double DEFAULT_SPAN_LENGTH_STEP_M = 0.50;
    public static final double DEFAULT_C1_STEP_M = 1.00;
}
