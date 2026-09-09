/**
 * Bridge Core - the solver-independent bridge domain model (spec
 * section 3, 7; architecture amendment v2). Plain Java, no framework
 * dependency. Must never reference Spring, MIDAS, ALLPLAN, SCIA, or any
 * other module's implementation types - only rules-engine,
 * generative-engine, analysis-api and midas-adapter depend on this
 * module, never the reverse.
 *
 * <p>P01: {@link com.spanova.bridgecore.Project},
 * {@link com.spanova.bridgecore.Bridge},
 * {@link com.spanova.bridgecore.SpanLayout},
 * {@link com.spanova.bridgecore.Span},
 * {@link com.spanova.bridgecore.Deck},
 * {@link com.spanova.bridgecore.Girder},
 * {@link com.spanova.bridgecore.Pier},
 * {@link com.spanova.bridgecore.Foundation},
 * {@link com.spanova.bridgecore.DesignSpace},
 * {@link com.spanova.bridgecore.BridgeAlternative} - all lengths in
 * meters (SI).
 */
package com.spanova.bridgecore;
