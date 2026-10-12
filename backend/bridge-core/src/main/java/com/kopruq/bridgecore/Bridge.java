package com.kopruq.bridgecore;

/**
 * Fixed, project-level facts about the bridge (spec section 9,
 * "PROJECT" group). All lengths are in meters (SI), per the KOPRUQ
 * unit policy (spec section 7).
 */
public record Bridge(String bridgeName, double totalLengthM, double deckWidthM) {

    /**
     * Lengths must be finite and not negative. Zero is allowed here on purpose (the generator
     * itself rejects a non-positive length with its own message); no positivity rule is invented.
     */
    public Bridge {
        if (!Double.isFinite(totalLengthM) || totalLengthM < 0) {
            throw new IllegalArgumentException("totalLengthM must be a finite number >= 0, got " + totalLengthM);
        }
        if (!Double.isFinite(deckWidthM) || deckWidthM < 0) {
            throw new IllegalArgumentException("deckWidthM must be a finite number >= 0, got " + deckWidthM);
        }
    }
}
