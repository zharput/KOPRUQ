package com.spanova.midas;

import com.spanova.analysis.AnalysisEngine;
import com.spanova.analysis.AnalysisJob;
import com.spanova.analysis.AnalysisJobId;
import com.spanova.analysis.AnalysisRequest;
import com.spanova.analysis.AnalysisResult;
import com.spanova.analysis.AnalysisStatus;
import com.spanova.analysis.DisplacementResult;
import com.spanova.analysis.LoadCase;
import com.spanova.analysis.ReactionResult;

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

    @Override
    public AnalysisJobId submit(AnalysisRequest request) {
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
        throw new UnsupportedOperationException(
                "MIDAS-P01: submit() already runs /doc/anal synchronously to completion - there is nothing to cancel yet");
    }

    private AnalysisJob job(AnalysisJobId jobId) {
        AnalysisJob job = jobs.get(jobId);
        if (job == null) {
            throw new IllegalArgumentException("Unknown job: " + jobId);
        }
        return job;
    }
}
