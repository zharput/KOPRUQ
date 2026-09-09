package com.spanova.api.alternatives;

import com.spanova.bridgecore.BridgeAlternative;

/**
 * Flat, frontend-friendly view of a {@link BridgeAlternative} for the
 * P03 results table. A presentation DTO, not a bridge-core domain
 * type - {@code bridge-core} stays free of API/JSON-shaping concerns.
 */
public record AlternativeRow(
        String id,
        int spanCount,
        double spanLengthM,
        double totalLengthM,
        int girderCount,
        double girderDepthM,
        boolean feasible) {

    /**
     * @param feasible result of running {@link com.spanova.rules.RuleEngine}
     *        (P04) against this alternative. With no rules approved yet,
     *        this is always {@code true} - the field exists so the wiring
     *        is real, not decorative, ahead of the first real rule.
     */
    public static AlternativeRow from(BridgeAlternative alternative, boolean feasible) {
        var spans = alternative.spanLayout().spans();
        double spanLengthM = spans.isEmpty() ? 0 : spans.get(0).lengthM();

        return new AlternativeRow(
                alternative.id().toString(),
                alternative.spanLayout().spanCount(),
                spanLengthM,
                alternative.spanLayout().totalLengthM(),
                alternative.girder().count(),
                alternative.girder().depthM(),
                feasible);
    }
}
