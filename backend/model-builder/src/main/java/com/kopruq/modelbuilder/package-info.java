/**
 * Builds solver-independent analysis models ({@link com.kopruq.analysis.AnalysisRequest}) from bridge input, and the
 * independent checks that belong to such a model. Not part of the analysis port (it contains behaviour), not a solver
 * and not the bridge domain. Currently: the portal-frame bridge model ({@link com.kopruq.modelbuilder.FrameBridgeModelBuilder})
 * and its applied-load summary ({@link com.kopruq.modelbuilder.AppliedLoadSummary}).
 *
 * <p>All lengths in metres, forces in kN (the unit system of {@code com.kopruq.analysis}). No dependency on Spring.
 */
package com.kopruq.modelbuilder;
