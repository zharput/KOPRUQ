package com.spanova.bridgelayout;

import java.util.List;

/**
 * A candidate intermediate pier position, evaluated against the
 * {@link com.spanova.constraints.NoPierZone}s passed to
 * {@link BridgeLayoutEngine}.
 */
public record PierCandidate(double chainageM, FeasibilityStatus feasibility, List<String> rejectionReasons) {
}
