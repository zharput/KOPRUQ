package com.spanova.api.fastsolver;

import java.util.List;

/**
 * @param totalAppliedLoadKn total self-weight + SDL, computed directly
 *        from the model's own geometry (independent of the solve) - a
 *        global-equilibrium sanity check against {@code totalReactionKn}
 * @param totalReactionKn sum of every support's vertical (fz) reaction
 */
public record FastSolverResponse(
        String status,
        String errorMessage,
        List<SupportReactionRow> reactions,
        List<DeckDisplacementRow> deckDisplacements,
        double totalAppliedLoadKn,
        double totalReactionKn) {
}
