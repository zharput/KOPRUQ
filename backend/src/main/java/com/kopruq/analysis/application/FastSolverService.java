package com.kopruq.analysis.application;

import com.kopruq.analysis.domain.AppliedLoadSummary;
import com.kopruq.analysis.enums.AnalysisStatus;
import com.kopruq.analysis.model.AnalysisResult;
import com.kopruq.analysis.model.DisplacementResult;
import com.kopruq.analysis.model.FrameBridgeModel;
import com.kopruq.analysis.model.NamedNode;
import com.kopruq.analysis.model.ReactionResult;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Runs a {@link FrameBridgeModel} through an {@link AnalysisEngine} and reports the reactions of the named supports
 * and the displacements of the named deck nodes, plus the independent applied-load total.
 */
public class FastSolverService {

    private final AnalysisEngine engine;

    public FastSolverService(AnalysisEngine engine) {
        this.engine = engine;
    }

    public FastSolverOutcome solve(FrameBridgeModel model) {
        var jobId = engine.submit(model.analysisRequest());
        AnalysisResult result = engine.getResults(jobId);

        if (result.status() != AnalysisStatus.COMPLETED) {
            return new FastSolverOutcome(result.status().name(), result.errorMessage(), List.of(), List.of(), 0, 0);
        }

        Map<Integer, ReactionResult> reactionsByNode = new HashMap<>();
        for (ReactionResult r : result.reactions()) {
            reactionsByNode.put(r.nodeId(), r);
        }
        Map<Integer, DisplacementResult> displacementsByNode = new HashMap<>();
        for (DisplacementResult d : result.displacements()) {
            displacementsByNode.put(d.nodeId(), d);
        }

        // Defensive: a node the solver returned nothing for must fail the request, not throw an NPE.
        for (NamedNode named : model.supportNodes()) {
            if (!reactionsByNode.containsKey(named.nodeId())) {
                return failed("The solver returned no reaction for support " + named.label());
            }
        }
        for (NamedNode named : model.deckNodes()) {
            if (!displacementsByNode.containsKey(named.nodeId())) {
                return failed("The solver returned no displacement for deck node " + named.label());
            }
        }

        var reactions = model.supportNodes().stream()
                .map(named -> new FastSolverOutcome.SupportReaction(named, reactionsByNode.get(named.nodeId())))
                .toList();
        var displacements = model.deckNodes().stream()
                .map(named -> new FastSolverOutcome.DeckDisplacement(named, displacementsByNode.get(named.nodeId())))
                .toList();

        double totalReactionKn = reactions.stream().mapToDouble(r -> r.reaction().fz()).sum();
        double totalAppliedLoadKn = AppliedLoadSummary.totalAppliedLoadKn(model.analysisRequest());

        return new FastSolverOutcome("COMPLETED", null, reactions, displacements, totalAppliedLoadKn, totalReactionKn);
    }

    private static FastSolverOutcome failed(String message) {
        return new FastSolverOutcome(AnalysisStatus.FAILED.name(), message, List.of(), List.of(), 0, 0);
    }
}
