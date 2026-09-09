package com.spanova.bridgecore;

/**
 * Fixed, project-level facts about the bridge (spec section 9,
 * "PROJECT" group). All lengths are in meters (SI), per the SPANOVA
 * unit policy (spec section 7).
 */
public record Bridge(String bridgeName, double totalLengthM, double deckWidthM) {
}
