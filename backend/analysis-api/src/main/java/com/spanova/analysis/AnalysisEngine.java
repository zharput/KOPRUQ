package com.spanova.analysis;

/**
 * The solver-independent port (the "IAnalysisEngine" from the master
 * spec/the engineer's MIDAS integration prompt, section 22). Bridge
 * Core, Rules Engine and Generative Engine depend on this interface
 * only, never on a specific solver adapter.
 *
 * <p>MIDAS-P01's {@code MidasCivilNxAnalysisEngine} implementation
 * happens to run {@code submit} synchronously to completion (MIDAS's own
 * {@code /doc/anal} call was verified to block until done), but callers
 * must not assume that - a future solver, or a later MIDAS milestone
 * with real batching, may make {@code submit} return before the job
 * finishes.
 */
public interface AnalysisEngine {

    AnalysisJobId submit(AnalysisRequest request);

    AnalysisStatus getStatus(AnalysisJobId jobId);

    /** @throws IllegalStateException if the job has not reached a terminal status yet */
    AnalysisResult getResults(AnalysisJobId jobId);

    void cancel(AnalysisJobId jobId);
}
