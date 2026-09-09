package com.spanova.analysis;

/**
 * MIDAS-P01 scope: only the terminal states a synchronous round trip
 * actually produces. MIDAS's own {@code /doc/anal} call was verified to
 * block until the analysis finishes (~10s for a trivial model), so there
 * is no genuine intermediate state to report yet - the richer status set
 * from docs/MIDAS_INTEGRATION_ANALYSIS.md (QUEUED, BUILDING_MODEL,
 * SUBMITTED, RUNNING, EXTRACTING_RESULTS, ...) is for the later
 * {@code AnalysisJobManager}, once batched/queued jobs are real.
 */
public enum AnalysisStatus {
    RUNNING,
    COMPLETED,
    FAILED
}
