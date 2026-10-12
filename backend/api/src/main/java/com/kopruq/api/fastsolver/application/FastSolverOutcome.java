package com.kopruq.api.fastsolver.application;

import com.kopruq.analysis.DisplacementResult;
import com.kopruq.analysis.ReactionResult;
import com.kopruq.modelbuilder.NamedNode;

import java.util.List;

/**
 * The result of one fast-solver run.
 *
 * @param status             the solver status name ({@code COMPLETED}, {@code FAILED}, ...)
 * @param errorMessage       populated unless the run completed
 * @param totalAppliedLoadKn total self-weight + SDL computed from the model own geometry (independent of the solve)
 * @param totalReactionKn    sum of every support vertical (fz) reaction
 */
public record FastSolverOutcome(
        String status,
        String errorMessage,
        List<SupportReaction> supportReactions,
        List<DeckDisplacement> deckDisplacements,
        double totalAppliedLoadKn,
        double totalReactionKn) {

    /** The reaction of one named support node. */
    public record SupportReaction(NamedNode node, ReactionResult reaction) {
    }

    /** The displacement of one named deck node. */
    public record DeckDisplacement(NamedNode node, DisplacementResult displacement) {
    }
}
