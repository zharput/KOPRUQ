package com.kopruq.layout.model;

import java.util.List;
import com.kopruq.layout.enums.FeasibilityStatus;

/**
 * A candidate intermediate pier position, evaluated against the
 * {@link com.kopruq.layout.model.NoPierZone}s passed to
 * {@link BridgeLayoutEngine}.
 */
public record PierCandidate(double chainageM, FeasibilityStatus feasibility, List<String> rejectionReasons) {
}
