/**
 * MIDAS Civil NX adapter (architecture amendment v2). MIDAS-P01 (single
 * simple beam, self-weight only): {@link com.kopruq.analysis.infra.midas.MidasApiClient}
 * (HTTP + auth), {@link com.kopruq.analysis.infra.midas.MidasModelBuilder} (pure
 * AnalysisRequest -&gt; MIDAS calls), {@link com.kopruq.analysis.infra.midas.MidasResultExtractor}
 * (pure MIDAS response -&gt; results), and
 * {@link com.kopruq.analysis.infra.midas.MidasCivilNxAnalysisEngine} (orchestrates all
 * three, implements analysis-api's {@code AnalysisEngine}) - verified
 * live against the engineer's own Civil NX, see
 * docs/midas-integration-analysis.md.
 *
 * Not yet built: load combinations, moving loads, construction stages,
 * seismic, tendons, or wiring a real {@code BridgeAlternative} in -
 * MIDAS-P01's model is a hand-built test beam, not yet connected to
 * generative-engine's output.
 */
package com.kopruq.analysis.infra.midas;
