package com.kopruq.modelbuilder;

import com.kopruq.analysis.AnalysisRequest;

import java.util.List;

/** The solver-ready {@link AnalysisRequest} plus human-readable labels for the result report. */
public record FrameBridgeModel(AnalysisRequest analysisRequest, List<NamedNode> deckNodes, List<NamedNode> supportNodes) {
}
