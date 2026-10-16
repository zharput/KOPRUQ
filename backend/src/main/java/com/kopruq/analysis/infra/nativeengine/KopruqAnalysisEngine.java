package com.kopruq.analysis.infra.nativeengine;

import com.kopruq.analysis.application.AnalysisEngine;
import com.kopruq.analysis.enums.AnalysisStatus;
import com.kopruq.analysis.model.AnalysisJob;
import com.kopruq.analysis.model.AnalysisJobId;
import com.kopruq.analysis.model.AnalysisRequest;
import com.kopruq.analysis.model.AnalysisResult;
import com.kopruq.analysis.model.DisplacementResult;
import com.kopruq.analysis.model.ReactionResult;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * KOPRUQ's own native analysis engine (docs/site-layout-platform-analysis.md
 * addendum P): linear-elastic direct-stiffness method, 3D frame
 * elements + elastic-link elements. This is the FAST/primary tier of the
 * FAST/INTERMEDIATE/FINAL {@link AnalysisEngine} hierarchy. The FINAL
 * tier is not defined (see docs/roadmap.md, solver-removal entry).
 *
 * <p>Synchronous-submit shape - {@link #submit} runs the full solve to
 * completion before returning, storing the outcome for
 * {@link #getStatus}/{@link #getResults}.
 */
public final class KopruqAnalysisEngine implements AnalysisEngine {

    private static final System.Logger LOG = System.getLogger(KopruqAnalysisEngine.class.getName());

    private final Map<AnalysisJobId, AnalysisJob> jobs = new ConcurrentHashMap<>();

    @Override
    public AnalysisJobId submit(AnalysisRequest request) {
        var jobId = new AnalysisJobId(UUID.randomUUID());
        jobs.put(jobId, new AnalysisJob(jobId, AnalysisStatus.RUNNING, null));

        try {
            FrameSolver.SolveResult solved = FrameSolver.solve(request);
            requireFiniteResults(solved);

            List<DisplacementResult> displacements = new ArrayList<>();
            solved.displacements().forEach((nodeId, d) ->
                    displacements.add(new DisplacementResult(nodeId, d[0], d[1], d[2], d[3], d[4], d[5])));

            List<ReactionResult> reactions = new ArrayList<>();
            solved.reactions().forEach((nodeId, r) ->
                    reactions.add(new ReactionResult(nodeId, r[0], r[1], r[2], r[3], r[4], r[5])));

            var result = new AnalysisResult(AnalysisStatus.COMPLETED, reactions, displacements, null);
            jobs.put(jobId, new AnalysisJob(jobId, AnalysisStatus.COMPLETED, result));
        } catch (RuntimeException e) {
            LOG.log(System.Logger.Level.WARNING, "Analysis job " + jobId + " failed", e);
            var result = new AnalysisResult(AnalysisStatus.FAILED, List.of(), List.of(), failureMessage(e));
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
        // The result is handed over exactly once; keeping every finished job forever would leak memory.
        jobs.remove(jobId);
        return job.result();
    }

    @Override
    public void cancel(AnalysisJobId jobId) {
        throw new UnsupportedOperationException("submit() already runs to completion synchronously - there is nothing to cancel");
    }

    /**
     * A solve that produced NaN/infinity (degenerate or overflowing model) is not a result:
     * it must fail the job instead of being reported as COMPLETED.
     */
    private static void requireFiniteResults(FrameSolver.SolveResult solved) {
        solved.displacements().forEach((nodeId, d) -> requireFinite("displacement", nodeId, d));
        solved.reactions().forEach((nodeId, r) -> requireFinite("reaction", nodeId, r));
    }

    private static void requireFinite(String kind, int nodeId, double[] values) {
        for (double v : values) {
            if (!Double.isFinite(v)) {
                throw new IllegalStateException("The solution contains a non-finite " + kind + " at node " + nodeId
                        + " - the model is degenerate or numerically unstable.");
            }
        }
    }

    private static String failureMessage(RuntimeException e) {
        return e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
    }

    private AnalysisJob job(AnalysisJobId jobId) {
        AnalysisJob job = jobs.get(jobId);
        if (job == null) {
            throw new IllegalArgumentException("Unknown job: " + jobId);
        }
        return job;
    }
}
