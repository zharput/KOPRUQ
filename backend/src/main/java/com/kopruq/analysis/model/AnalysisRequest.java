package com.kopruq.analysis.model;

import java.util.List;

/**
 * A solver-independent structural model + load description - the input
 * to {@link AnalysisEngine} (spec section 20's P06/P07: canonical bridge
 * model to solver model). This type never references a specific solver;
 * every solver adapter implements the same {@link AnalysisEngine}
 * contract against the same request shape. Units: see the package
 * documentation (m, kN, ...).
 *
 * <p>First-milestone scope: only {@code nodes}, one {@code materials} entry,
 * one {@code sections} entry, {@code elements}, {@code supports}, one
 * {@code loadCases} entry and its matching {@code selfWeights} entry are
 * populated - no load combinations, construction stages, moving loads,
 * tendons or seismic yet.
 *
 * <p>{@code elasticLinks}/{@code uniformLoads} added for the native
 * {@code kopruq-analysis-engine} (docs/site-layout-platform-analysis.md
 * addendum P) - bearings modelled as {@link ElasticLinkElement}s,
 * externally-supplied UDLs (e.g. SDL) as {@link UniformElementLoad}s -
 * neither solver-specific. Empty lists = the original first-milestone requests
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
