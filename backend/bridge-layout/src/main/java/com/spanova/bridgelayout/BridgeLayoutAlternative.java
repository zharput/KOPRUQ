package com.spanova.bridgelayout;

import java.util.List;

/**
 * One candidate bridge layout: where the abutments and piers sit along
 * the alignment, and the resulting uniform span arrangement.
 *
 * <p>Deliberately excludes preliminary foundations, earthwork,
 * quantities, cost and carbon (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md
 * section C names these) - each needs an engineer-approved estimation
 * method that does not exist yet; adding them now would mean inventing
 * one (spec section 22). Add each once its method is approved.
 *
 * <p>Uniform span layout only - same reading already used by
 * {@code generative-engine}'s {@code AlternativeGenerator} for P03; see
 * that class's javadoc for the rationale.
 */
public record BridgeLayoutAlternative(
        String id,
        AbutmentCandidate c1,
        AbutmentCandidate c2,
        List<PierCandidate> piers,
        List<Double> spanLengthsM,
        double bridgeLengthM,
        FeasibilityStatus feasibilityStatus,
        List<ConstraintCheckResult> constraintResults) {
}
