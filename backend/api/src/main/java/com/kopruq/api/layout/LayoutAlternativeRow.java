package com.kopruq.api.layout;

import com.kopruq.bridgelayout.BridgeLayoutAlternative;
import com.kopruq.bridgelayout.FeasibilityStatus;

import java.util.List;

/**
 * Flat, frontend-friendly view of a {@link BridgeLayoutAlternative} for
 * the Site & Layout results table - a presentation DTO, not a
 * bridge-layout domain type (same discipline as {@code AlternativeRow}
 * for {@code bridge-core}'s {@code BridgeAlternative}).
 */
public record LayoutAlternativeRow(
        String id,
        double c1ChainageM,
        double c2ChainageM,
        double bridgeLengthM,
        int spanCount,
        double spanLengthM,
        boolean feasible,
        List<PierRow> piers) {

    public static LayoutAlternativeRow from(BridgeLayoutAlternative alternative) {
        double spanLengthM = alternative.spanLengthsM().isEmpty() ? 0 : alternative.spanLengthsM().get(0);

        return new LayoutAlternativeRow(
                alternative.id(),
                alternative.c1().chainageM(),
                alternative.c2().chainageM(),
                alternative.bridgeLengthM(),
                alternative.spanLengthsM().size(),
                spanLengthM,
                alternative.feasibilityStatus() == FeasibilityStatus.FEASIBLE,
                alternative.piers().stream().map(PierRow::from).toList());
    }
}
