package com.kopruq.layout.enums;

/**
 * Whether a candidate pier/layout satisfies the constraints checked so
 * far. Only {@code FEASIBLE}/{@code REJECT} exist for now - the
 * {@code WARNING} tier named in docs/site-layout-platform-analysis.md
 * section C is deferred until a soft-constraint check (geotechnical,
 * hydraulic) actually exists to produce one.
 */
public enum FeasibilityStatus {
    FEASIBLE,
    REJECT
}
