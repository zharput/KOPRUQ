package com.kopruq.analysis.infra.midas;

import com.kopruq.analysis.application.AnalysisEngine;
import com.kopruq.analysis.enums.AnalysisStatus;
import com.kopruq.analysis.model.AnalysisJob;
import com.kopruq.analysis.model.AnalysisJobId;
import com.kopruq.analysis.model.AnalysisRequest;
import com.kopruq.analysis.model.AnalysisResult;
import com.kopruq.analysis.model.DisplacementResult;
import com.kopruq.analysis.model.LoadCase;
import com.kopruq.analysis.model.ReactionResult;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * MIDAS Civil NX implementation of {@link AnalysisEngine} - the only
 * class here that orchestrates the full round trip: build model, run
 * analysis, extract results. All MIDAS-specific logic stays in this
 * module (spec section 21) - callers depend on {@link AnalysisEngine}
 * only.
 *
 * <p>MIDAS-P01 scope: {@link #submit} runs synchronously to completion
 * (MIDAS's own {@code /doc/anal} was verified to block until the
 * analysis finishes), storing the outcome for later retrieval by
 * {@link #getStatus}/{@link #getResults}. This is honest about what was
 * actually verified, not a guess at future async behaviour.
 */
public final class MidasCivilNxAnalysisEngine implements AnalysisEngine {

    private static final System.Logger LOG = System.getLogger(MidasCivilNxAnalysisEngine.class.getName());

    private final MidasHttpClient client;
    private final MidasModelBuilder modelBuilder;
    private final MidasResultExtractor resultExtractor;
    private final Map<AnalysisJobId, AnalysisJob> jobs = new ConcurrentHashMap<>();

    public MidasCivilNxAnalysisEngine(MidasHttpClient client) {
        this(client, new MidasModelBuilder(), new MidasResultExtractor());
    }

    MidasCivilNxAnalysisEngine(MidasHttpClient client, MidasModelBuilder modelBuilder, MidasResultExtractor resultExtractor) {
        this.client = client;
        this.modelBuilder = modelBuilder;
        this.resultExtractor = resultExtractor;
    }

    /**
     * {@code synchronized}: MIDAS holds ONE open document per session ({@code /doc/new} replaces it), so two
     * concurrent submits would interleave their model-building calls and read each other's results. Concurrent
     * callers are therefore queued.
     */
    @Override
    public synchronized AnalysisJobId submit(AnalysisRequest request) {
        var jobId = new AnalysisJobId(UUID.randomUUID());
        jobs.put(jobId, new AnalysisJob(jobId, AnalysisStatus.RUNNING, null));

        try {
            for (MidasApiCall call : modelBuilder.buildCalls(request)) {
                client.call(call.method(), call.path(), call.body());
            }

            client.call("POST", "/doc/anal", null);

            var reactions = new ArrayList<ReactionResult>();
            var displacements = new ArrayList<DisplacementResult>();
            for (LoadCase loadCase : request.loadCases()) {
                var reactionsCall = resultExtractor.reactionsRequest(loadCase.name());
                var reactionsResponse = client.call(reactionsCall.method(), reactionsCall.path(), reactionsCall.body());
                reactions.addAll(resultExtractor.parseReactions(reactionsResponse));

                var displacementsCall = resultExtractor.displacementsRequest(loadCase.name());
                var displacementsResponse = client.call(displacementsCall.method(), displacementsCall.path(), displacementsCall.body());
                displacements.addAll(resultExtractor.parseDisplacements(displacementsResponse));
            }

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
        throw new UnsupportedOperationException(
                "MIDAS-P01: submit() already runs /doc/anal synchronously to completion - there is nothing to cancel yet");
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
