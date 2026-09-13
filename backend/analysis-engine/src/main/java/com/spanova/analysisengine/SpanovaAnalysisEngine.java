package com.spanova.analysisengine;

import com.spanova.analysis.AnalysisEngine;
import com.spanova.analysis.AnalysisJob;
import com.spanova.analysis.AnalysisJobId;
import com.spanova.analysis.AnalysisRequest;
import com.spanova.analysis.AnalysisResult;
import com.spanova.analysis.AnalysisStatus;
import com.spanova.analysis.DisplacementResult;
import com.spanova.analysis.ReactionResult;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * SPANOVA's own native analysis engine (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md
 * addendum P): linear-elastic direct-stiffness method, 3D frame
 * elements + elastic-link elements. This is the FAST/primary tier of the
 * FAST/INTERMEDIATE/FINAL {@link AnalysisEngine} hierarchy - MIDAS NX
 * ({@code midas-adapter}) stays the FINAL, post-selection verification
 * tier, never called during generation/optimization.
 *
 * <p>Same synchronous-submit shape as {@code MidasCivilNxAnalysisEngine}
 * (MIDAS-P01 precedent) - {@link #submit} runs the full solve to
 * completion before returning, storing the outcome for
 * {@link #getStatus}/{@link #getResults}.
 */
public final class SpanovaAnalysisEngine implements AnalysisEngine {

    private final Map<AnalysisJobId, AnalysisJob> jobs = new ConcurrentHashMap<>();

    @Override
    public AnalysisJobId submit(AnalysisRequest request) {
        var jobId = new AnalysisJobId(UUID.randomUUID());
        jobs.put(jobId, new AnalysisJob(jobId, AnalysisStatus.RUNNING, null));

        try {
            FrameSolver.SolveResult solved = FrameSolver.solve(request);

            List<DisplacementResult> displacements = new ArrayList<>();
            solved.displacements().forEach((nodeId, d) ->
                    displacements.add(new DisplacementResult(nodeId, d[0], d[1], d[2], d[3], d[4], d[5])));

            List<ReactionResult> reactions = new ArrayList<>();
            solved.reactions().forEach((nodeId, r) ->
                    reactions.add(new ReactionResult(nodeId, r[0], r[1], r[2], r[3], r[4], r[5])));

            var result = new AnalysisResult(AnalysisStatus.COMPLETED, reactions, displacements, null);
            jobs.put(jobId, new AnalysisJob(jobId, AnalysisStatus.COMPLETED, result));
        } catch (RuntimeException e) {
            var result = new AnalysisResult(AnalysisStatus.FAILED, List.of(), List.of(), e.getMessage());
            jobs.put(jobId, new AnalysisJob(jobId, AnalysisStatus.FAILED, result));
        }

        return jobId;
    }

    @Override
    public AnalysisStatus getStatus(AnalysisJobId jobId) {
        return job(jobId).status();
    }

    @Override
    public AnalysisResult getResults(AnalysisJobId jobId) {
        AnalysisJob job = job(jobId);
        if (job.status() == AnalysisStatus.RUNNING) {
            throw new IllegalStateException("Job " + jobId + " has not finished yet");
        }
        return job.result();
    }

    @Override
    public void cancel(AnalysisJobId jobId) {
        throw new UnsupportedOperationException("submit() already runs to completion synchronously - there is nothing to cancel");
    }

    private AnalysisJob job(AnalysisJobId jobId) {
        AnalysisJob job = jobs.get(jobId);
        if (job == null) {
            throw new IllegalArgumentException("Unknown job: " + jobId);
        }
        return job;
    }
}
