package com.spanova.midas;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spanova.analysis.AnalysisElement;
import com.spanova.analysis.AnalysisJobId;
import com.spanova.analysis.AnalysisMaterial;
import com.spanova.analysis.AnalysisNode;
import com.spanova.analysis.AnalysisRequest;
import com.spanova.analysis.AnalysisStatus;
import com.spanova.analysis.BoundaryCondition;
import com.spanova.analysis.LoadCase;
import com.spanova.analysis.SelfWeight;
import com.spanova.analysis.SolidRectangleSection;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies the full submit -&gt; getStatus -&gt; getResults orchestration
 * against a fake {@link MidasHttpClient} (no network) - the canned
 * responses are the same fixtures used by {@code MidasResultExtractorTest},
 * captured from the live MIDAS-P01 round trip on 2026-09-09.
 */
class MidasCivilNxAnalysisEngineTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final AnalysisRequest SIMPLE_BEAM = new AnalysisRequest(
            List.of(new AnalysisNode(1, 0, 0, 0), new AnalysisNode(2, 20, 0, 0)),
            List.of(new AnalysisElement(1, 1, 1, 1, 2)),
            List.of(),
            List.of(new AnalysisMaterial(1, "CONC", "C30", 30_000_000, 0.2, 0.00001, 24.5, 2.5)),
            List.of(new SolidRectangleSection(1, "GIRDER-1", 2.0, 1.0)),
            List.of(
                    new BoundaryCondition(1, true, true, true, true, false, false),
                    new BoundaryCondition(2, false, true, true, true, false, false)),
            List.of(new LoadCase("SelfWeight", "D")),
            List.of(new SelfWeight("SelfWeight", 0, 0, -1)),
            List.of());

    @Test
    void submit_runsTheFullRoundTrip_andReturnsACompletedJobWithParsedResults() throws Exception {
        var calls = new ArrayList<String>();
        var engine = new MidasCivilNxAnalysisEngine(fakeSuccessfulClient(calls));

        AnalysisJobId jobId = engine.submit(SIMPLE_BEAM);

        assertEquals(AnalysisStatus.COMPLETED, engine.getStatus(jobId));
        var result = engine.getResults(jobId);
        assertEquals(AnalysisStatus.COMPLETED, result.status());
        assertEquals(2, result.reactions().size());
        assertEquals(490.0, result.reactions().get(0).fz());
        assertEquals(2, result.displacements().size());
        assertEquals(0.000817, result.displacements().get(0).ry());

        assertEquals(
                List.of("/doc/new", "/db/stld", "/db/matl", "/db/sect", "/db/node", "/db/elem",
                        "/db/cons", "/db/bodf", "/doc/anal", "/post/table", "/post/table"),
                calls);
    }

    @Test
    void submit_whenMidasRejectsACall_marksTheJobFailed_withTheErrorMessage_notAnUnhandledException() {
        MidasHttpClient failingClient = (method, path, body) -> {
            if (path.equals("/db/matl")) {
                throw new MidasApiException("MIDAS API rejected PUT /db/matl: Wrong Field");
            }
            return MAPPER.createObjectNode();
        };
        var engine = new MidasCivilNxAnalysisEngine(failingClient);

        AnalysisJobId jobId = engine.submit(SIMPLE_BEAM);

        assertEquals(AnalysisStatus.FAILED, engine.getStatus(jobId));
        var result = engine.getResults(jobId);
        assertEquals(AnalysisStatus.FAILED, result.status());
        assertTrue(result.reactions().isEmpty());
        assertTrue(result.errorMessage().contains("Wrong Field"));
    }

    @Test
    void getResults_beforeSubmit_throwsRatherThanReturningNull() {
        var engine = new MidasCivilNxAnalysisEngine(fakeSuccessfulClient(new ArrayList<>()));

        assertThrows(IllegalArgumentException.class, () -> engine.getResults(new AnalysisJobId(java.util.UUID.randomUUID())));
    }

    private MidasHttpClient fakeSuccessfulClient(List<String> callLog) {
        Function<String, JsonNode> fixture = tableType -> {
            try {
                String json = tableType.equals("REACTIONG")
                        ? """
                        {"Reactions":{"DATA":[["1","1","SelfWeight","0.000000","0.000000","490.000000","0.000000","0.000000","0.000000"],\
                        ["2","2","SelfWeight","0.000000","0.000000","490.000000","0.000000","0.000000","0.000000"]]}}"""
                        : """
                        {"Displacements":{"DATA":[["1","1","SelfWeight","0.000000","0.000000","0.000000","0.000000","0.000817","0.000000"],\
                        ["2","2","SelfWeight","0.000000","0.000000","0.000000","0.000000","-0.000817","0.000000"]]}}""";
                return MAPPER.readTree(json);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        };

        return (method, path, body) -> {
            callLog.add(path);
            if (path.equals("/post/table")) {
                String tableType = body.get("Argument").get("TABLE_TYPE").asText();
                return fixture.apply(tableType);
            }
            return MAPPER.createObjectNode();
        };
    }
}
