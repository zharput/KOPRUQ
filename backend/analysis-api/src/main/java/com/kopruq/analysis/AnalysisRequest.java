package com.kopruq.analysis;

import java.util.List;

/**
 * A solver-independent structural model + load description - the input
 * to {@link AnalysisEngine}. Field names/shapes mirror what MIDAS Civil
 * NX's own API needs (spec section 20's P06/P07: "canonical
 * BridgeAlternative -&gt; MIDAS model"), but this type itself must never
 * reference MIDAS - a future solver adapter (SCIA, ...) implements the
 * same {@link AnalysisEngine} contract against the same request shape.
 *
 * <p>MIDAS-P01 scope: only {@code nodes}, one {@code materials} entry,
 * one {@code sections} entry, {@code elements}, {@code supports}, one
 * {@code loadCases} entry and its matching {@code selfWeights} entry are
 * populated - no load combinations, construction stages, moving loads,
 * tendons or seismic yet (see docs/MIDAS_INTEGRATION_ANALYSIS.md for the
 * full staged plan).
 *
 * <p>{@code elasticLinks}/{@code uniformLoads} added for the native
 * {@code kopruq-analysis-engine} (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md
 * addendum P) - bearings modelled as {@link ElasticLinkElement}s,
 * externally-supplied UDLs (e.g. SDL) as {@link UniformElementLoad}s -
 * neither MIDAS-specific. Empty lists = existing MIDAS-P01 requests
 * unaffected.
 */
public record AnalysisRequest(
        List<AnalysisNode> nodes,
        List<AnalysisElement> elements,
        List<ElasticLinkElement> elasticLinks,
        List<AnalysisMaterial> materials,
        List<AnalysisSection> sections,
        List<BoundaryCondition> supports,
        List<LoadCase> loadCases,
        List<SelfWeight> selfWeights,
        List<UniformElementLoad> uniformLoads) {
}
