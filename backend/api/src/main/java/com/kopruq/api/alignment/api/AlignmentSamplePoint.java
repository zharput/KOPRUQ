package com.kopruq.api.alignment;

/**
 * A horizontal-only sample point along an alignment - no z/elevation,
 * since no vertical alignment model exists yet ({@code Alignment}'s own
 * class javadoc). The 3D viewer drapes these onto terrain elevation
 * itself via a separate {@code /api/terrain/{id}/elevation} query, not
 * this endpoint - returning a fabricated z here would be inventing
 * engineering data (spec section 22).
 */
public record AlignmentSamplePoint(double xM, double yM, double chainageM) {
}
