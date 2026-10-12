/**
 * Bridge Core - the solver-independent bridge domain model (spec
 * section 3, 7; architecture amendment v2). Plain Java, no framework
 * dependency. Must never reference Spring, MIDAS, ALLPLAN, SCIA, or any
 * other module's implementation types - only rules-engine,
 * generative-engine, analysis-api and midas-adapter depend on this
 * module, never the reverse.
 *
 * <p>P01: {@link com.kopruq.bridge.model.Project},
 * {@link com.kopruq.bridge.model.Bridge},
 * {@link com.kopruq.bridge.model.SpanLayout},
 * {@link com.kopruq.bridge.model.Span},
 * {@link com.kopruq.bridge.model.Deck},
 * {@link com.kopruq.bridge.model.Girder},
 * {@link com.kopruq.bridge.model.Pier},
 * {@link com.kopruq.bridge.model.Foundation},
 * {@link com.kopruq.bridge.model.DesignSpace},
 * {@link com.kopruq.bridge.model.BridgeAlternative} - all lengths in
 * meters (SI).
 *
 * <p>Persistence: the {@code Project} aggregate is stored by the JPA adapter in {@code bridge.infra.persistence}
 * behind the {@code bridge.application.ProjectRepository} port; the model types stay framework-free. Computed results
 * (rule results, layouts, loads, analysis) are deliberately not persisted.
 */
package com.kopruq.bridge;
