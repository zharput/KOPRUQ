/**
 * Analysis API - solver-independent job/status/cancel/retry/result
 * contracts (spec section 14). This is the "IAnalysisEngine" port from
 * the original spec, now living in its own module so both midas-adapter
 * and any future solver adapter (SCIA, ALLPLAN) implement the same
 * interface without bridge-core, rules-engine or generative-engine ever
 * knowing which solver is in use.
 *
 * <p>{@link com.kopruq.analysis.application.AnalysisEngine} plus its request/result
 * types are the MIDAS-P01 minimal shape (reactions/displacements for a
 * simple beam only) - see docs/MIDAS_INTEGRATION_ANALYSIS.md for the
 * full staged plan (load combinations, moving loads, construction
 * stages, seismic, bearing/foundation results all come later, without
 * reshaping this port).
 *
 * <p><b>Unit system of this port</b> (a solver adapter must make its session use it, or convert):
 * length m, force kN, so moduli and stresses kN/m2, weight density kN/m3, mass density t/m3, angles rad,
 * thermal expansion 1/degC, translational spring stiffness kN/m, rotational spring stiffness kN*m/rad.
 * Solver-specific vocabularies (material types, load-case types, section shape codes) live only in the
 * adapters.
 */
package com.kopruq.analysis;
