package com.kopruq.analysis.model;

import java.util.List;
import com.kopruq.analysis.enums.AnalysisStatus;

/**
 * Outcome of one {@link AnalysisEngine} job. MIDAS-P01 scope: reactions
 * and displacements only - girder/pier/bearing/foundation summaries and
 * engineering QA checks are later milestones (see
 * docs/midas-integration-analysis.md section 5).
 *
 * @param errorMessage populated only when {@code status} is {@link AnalysisStatus#FAILED}
 */
public record AnalysisResult(
        AnalysisStatus status,
        List<ReactionResult> reactions,
        List<DisplacementResult> displacements,
        String errorMessage) {
}
