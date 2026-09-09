/**
 * Analysis API - solver-independent job/status/cancel/retry/result
 * contracts (spec section 14). This is the "IAnalysisEngine" port from
 * the original spec, now living in its own module so both midas-adapter
 * and any future solver adapter (SCIA, ALLPLAN) implement the same
 * interface without bridge-core, rules-engine or generative-engine ever
 * knowing which solver is in use.
 *
 * {@link com.spanova.analysis.AnalysisEngine} plus its request/result
 * types are the MIDAS-P01 minimal shape (reactions/displacements for a
 * simple beam only) - see docs/MIDAS_INTEGRATION_ANALYSIS.md for the
 * full staged plan (load combinations, moving loads, construction
 * stages, seismic, bearing/foundation results all come later, without
 * reshaping this port).
 */
package com.spanova.analysis;
