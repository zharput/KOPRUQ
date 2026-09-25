package com.kopruq.api.alignment;

/** A single straight alignment segment (TERRAIN-P01 scope - matches {@code Alignment}'s current straight-only support). */
public record AlignmentSampleRequest(
        double startXM, double startYM,
        double endXM, double endYM,
        double stepM) {
}
