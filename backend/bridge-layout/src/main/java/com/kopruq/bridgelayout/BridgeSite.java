package com.kopruq.bridgelayout;

/**
 * A chainage range on an {@link com.kopruq.alignment.Alignment} where a
 * bridge crossing must be accommodated (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md
 * section C). {@code crossingType} is free text for now (e.g. "River",
 * "Highway") - same discipline already used for
 * {@code bridge-core}'s {@code Pier.pierType}, not a closed enum until a
 * real need to branch on it appears.
 */
public record BridgeSite(String id, String name, double startChainageM, double endChainageM, String crossingType) {

    public BridgeSite {
        if (startChainageM >= endChainageM) {
            throw new IllegalArgumentException("startChainageM must be < endChainageM");
        }
    }
}
