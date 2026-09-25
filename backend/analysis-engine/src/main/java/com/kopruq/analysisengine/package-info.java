/**
 * KOPRUQ's native analysis engine (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md
 * addendum P): a linear-elastic 3D direct-stiffness-method solver for
 * frame elements + elastic-link elements, implementing the
 * {@code AnalysisEngine} port from {@code analysis-api}. No Spring, no
 * MIDAS, no external linear-algebra dependency.
 *
 * <p>{@link com.kopruq.analysisengine.KopruqAnalysisEngine} is the
 * only public type - everything else (stiffness matrices,
 * transformation, section properties, the dense solver) is an internal
 * implementation detail.
 */
package com.kopruq.analysisengine;
