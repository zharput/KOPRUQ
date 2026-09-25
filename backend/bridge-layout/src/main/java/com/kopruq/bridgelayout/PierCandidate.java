package com.kopruq.bridgelayout;

import java.util.List;

/**
 * A candidate intermediate pier position, evaluated against the
 * {@link com.kopruq.constraints.NoPierZone}s passed to
 * {@link BridgeLayoutEngine}.
 */
public record PierCandidate(double chainageM, FeasibilityStatus feasibility, List<String> rejectionReasons) {
}
