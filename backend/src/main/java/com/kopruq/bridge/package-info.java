/**
 * Bridge Core - the solver-independent bridge domain model (spec
 * section 3, 7; architecture amendment v2). Plain Java, no framework
 * dependency. Must never reference Spring, ALLPLAN, SCIA, or any
 * other module's implementation types - only rules-engine,
 * generative-engine and analysis-api depend on this
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
 *
 * <p>Stored projects (backend-db-persistence M1): the project revision rule lives in {@code Project}; the workspace
 * ({@code ProjectWorkspace}, a {@code ProjectSection}) is stored through the {@code ProjectContentRepository} port and
 * served by {@code ProjectController}; see docs/architecture.md.
 *
 * <p>Design-system sections (backend-db-persistence M2): bridge definitions, family catalogs, girder library, preferred span
 * rules and cross section are further {@code ProjectSection}s, stored by {@code DesignSystemContentStore} and served by
 * {@code ProjectDesignSystemController}; see docs/architecture.md.
 *
 * <p>Load inputs and graph documents (backend-db-persistence M3): the six load-input sections (seismic, wind,
 * temperature, self-weight, traffic LM1, wind snapshot - inputs only) and the graph documents (upserted one by one)
 * are further {@code ProjectSection}s, stored by {@code LoadInputContentStore} and {@code GraphContentStore} and served
 * by {@code ProjectLoadInputController} and {@code ProjectGraphController}; see docs/architecture.md.
 */
package com.kopruq.bridge;
