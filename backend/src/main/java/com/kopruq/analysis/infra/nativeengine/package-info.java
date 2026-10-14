/**
 * KOPRUQ's native analysis engine (docs/site-layout-platform-analysis.md
 * addendum P): a linear-elastic 3D direct-stiffness-method solver for
 * frame elements + elastic-link elements, implementing the
 * {@code AnalysisEngine} port from {@code analysis-api}. No Spring, no
 * MIDAS, no external linear-algebra dependency.
 *
 * <p>{@link com.kopruq.analysis.infra.nativeengine.KopruqAnalysisEngine} is the
 * only public type - everything else (stiffness matrices,
 * transformation, section properties, the dense solver) is an internal
 * implementation detail.
 */
package com.kopruq.analysis.infra.nativeengine;
