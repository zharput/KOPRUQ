/**
 * MIDAS Civil NX adapter (architecture amendment v2). MIDAS-P01 (single
 * simple beam, self-weight only): {@link com.spanova.midas.MidasApiClient}
 * (HTTP + auth), {@link com.spanova.midas.MidasModelBuilder} (pure
 * AnalysisRequest -&gt; MIDAS calls), {@link com.spanova.midas.MidasResultExtractor}
 * (pure MIDAS response -&gt; results), and
 * {@link com.spanova.midas.MidasCivilNxAnalysisEngine} (orchestrates all
 * three, implements analysis-api's {@code AnalysisEngine}) - verified
 * live against the engineer's own Civil NX, see
 * docs/MIDAS_INTEGRATION_ANALYSIS.md.
 *
 * Not yet built: load combinations, moving loads, construction stages,
 * seismic, tendons, or wiring a real {@code BridgeAlternative} in -
 * MIDAS-P01's model is a hand-built test beam, not yet connected to
 * generative-engine's output.
 */
package com.spanova.midas;
