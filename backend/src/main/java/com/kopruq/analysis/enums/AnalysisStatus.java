package com.kopruq.analysis.enums;

/**
 * P01 scope: only the terminal states a synchronous round trip
 * actually produces. The current engines run synchronously to
 * completion, so there is no genuine intermediate state to report yet -
 * a richer status set (QUEUED, BUILDING_MODEL, SUBMITTED, RUNNING,
 * EXTRACTING_RESULTS, ...) is for a later {@code AnalysisJobManager},
 * once batched/queued jobs are real.
 */
public enum AnalysisStatus {
    RUNNING,
    COMPLETED,
    FAILED
}
