package com.kopruq.layout.api;

import com.kopruq.layout.enums.FeasibilityStatus;
import com.kopruq.layout.model.PierCandidate;

import java.util.List;

/** Flat, frontend-friendly view of a {@link PierCandidate}. */
public record PierRow(double chainageM, boolean feasible, List<String> rejectionReasons) {

    public static PierRow from(PierCandidate candidate) {
        return new PierRow(
                candidate.chainageM(),
                candidate.feasibility() == FeasibilityStatus.FEASIBLE,
                candidate.rejectionReasons());
    }
}
