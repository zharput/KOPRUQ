package com.kopruq.analysis.model;


import java.util.List;

/** The solver-ready {@link AnalysisRequest} plus human-readable labels for the result report. */
public record FrameBridgeModel(AnalysisRequest analysisRequest, List<NamedNode> deckNodes, List<NamedNode> supportNodes) {
}
