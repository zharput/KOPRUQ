/**
 * Bridge Core - the solver-independent bridge domain model (spec
 * section 3, 7; architecture amendment v2). Plain Java, no framework
 * dependency. Must never reference Spring, MIDAS, ALLPLAN, SCIA, or any
 * other module's implementation types - only rules-engine,
 * generative-engine, analysis-api and midas-adapter depend on this
 * module, never the reverse.
 *
 * <p>P01: {@link com.kopruq.bridgecore.Project},
 * {@link com.kopruq.bridgecore.Bridge},
 * {@link com.kopruq.bridgecore.SpanLayout},
 * {@link com.kopruq.bridgecore.Span},
 * {@link com.kopruq.bridgecore.Deck},
 * {@link com.kopruq.bridgecore.Girder},
 * {@link com.kopruq.bridgecore.Pier},
 * {@link com.kopruq.bridgecore.Foundation},
 * {@link com.kopruq.bridgecore.DesignSpace},
 * {@link com.kopruq.bridgecore.BridgeAlternative} - all lengths in
 * meters (SI).
 */
package com.kopruq.bridgecore;
