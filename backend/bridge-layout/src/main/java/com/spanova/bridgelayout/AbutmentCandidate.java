package com.spanova.bridgelayout;

/**
 * A candidate abutment (C1 or C2) position.
 *
 * <p>No feasibility/height fields yet - terrain-derived abutment height
 * and foundation level are deferred (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md
 * addendum Q: heights are entered externally, not computed here, and are
 * not consumed by this milestone at all - they belong to the future
 * native analysis engine milestone).
 */
public record AbutmentCandidate(double chainageM) {
}
