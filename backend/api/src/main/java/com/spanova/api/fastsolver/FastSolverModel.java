package com.spanova.api.fastsolver;

import com.spanova.analysis.AnalysisRequest;

import java.util.List;

/** The solver-ready {@link AnalysisRequest} plus human-readable labels for the result report. */
public record FastSolverModel(AnalysisRequest analysisRequest, List<NamedNode> deckNodes, List<NamedNode> supportNodes) {
}
