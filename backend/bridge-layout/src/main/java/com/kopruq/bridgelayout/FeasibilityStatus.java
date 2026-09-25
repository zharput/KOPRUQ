package com.kopruq.bridgelayout;

/**
 * Whether a candidate pier/layout satisfies the constraints checked so
 * far. Only {@code FEASIBLE}/{@code REJECT} exist for now - the
 * {@code WARNING} tier named in docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md
 * section C is deferred until a soft-constraint check (geotechnical,
 * hydraulic) actually exists to produce one.
 */
public enum FeasibilityStatus {
    FEASIBLE,
    REJECT
}
