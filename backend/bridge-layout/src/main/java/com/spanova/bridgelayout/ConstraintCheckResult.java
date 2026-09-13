package com.spanova.bridgelayout;

/** One constraint check performed against one candidate pier - kept for traceability (spec section 22's "deterministic, traceable" principle). */
public record ConstraintCheckResult(String constraintId, double pierChainageM, boolean violated, String detail) {
}
