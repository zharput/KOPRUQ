package com.kopruq.constraints;

/**
 * A chainage range along a {@link com.kopruq.alignment.Alignment} where
 * no pier may be placed.
 *
 * <p>This is a deliberately simplified stand-in for the full
 * {@code ConstraintObject}/3D-exclusion-volume model described in
 * docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md section C - LAYOUT-P01's own
 * scope note (section M, addendum Q) asks for "one NoPierZone... not the
 * full ConstraintType enum". Since pier candidates are chainage-only for
 * now (no real XY/offset variation yet), a chainage range is sufficient
 * and honest; it does not need JTS or a real 2D/3D geometry check. Widen
 * this into a real spatial volume (offset range, vertical range, JTS
 * intersection) only once a milestone actually needs it.
 */
public record NoPierZone(String id, double startChainageM, double endChainageM, String description) {

    public NoPierZone {
        if (startChainageM > endChainageM) {
            throw new IllegalArgumentException("startChainageM must be <= endChainageM");
        }
    }

    public boolean containsChainage(double chainageM, double toleranceM) {
        return chainageM >= startChainageM - toleranceM && chainageM <= endChainageM + toleranceM;
    }
}
