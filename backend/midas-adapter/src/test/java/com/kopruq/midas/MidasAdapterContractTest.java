package com.kopruq.midas;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kopruq.analysis.AnalysisElement;
import com.kopruq.analysis.AnalysisJobId;
import com.kopruq.analysis.AnalysisMaterial;
import com.kopruq.analysis.AnalysisNode;
import com.kopruq.analysis.AnalysisRequest;
import com.kopruq.analysis.AnalysisStatus;
import com.kopruq.analysis.BoundaryCondition;
import com.kopruq.analysis.ElasticLinkElement;
import com.kopruq.analysis.LoadCase;
import com.kopruq.analysis.LoadCaseKind;
import com.kopruq.analysis.MaterialKind;
import com.kopruq.analysis.SelfWeight;
import com.kopruq.analysis.SolidRectangleSection;
import com.kopruq.analysis.UniformElementLoad;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** BACKEND-REMEDIATION Faz 8: adapter contract - unsupported content fails loudly, HEAD is verified, submit is serialized. */
class MidasAdapterContractTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static AnalysisRequest request(List<ElasticLinkElement> links, List<UniformElementLoad> loads) {
        return new AnalysisRequest(
                List.of(new AnalysisNode(1, 0, 0, 0), new AnalysisNode(2, 20, 0, 0)),
                List.of(new AnalysisElement(1, 1, 1, 1, 2)),
                links,
                List.of(new AnalysisMaterial(1, MaterialKind.CONCRETE, "C30", 30_000_000, 0.2, 0.00001, 24.5, 2.5)),
                List.of(new SolidRectangleSection(1, "GIRDER-1", 2.0, 1.0)),
                List.of(new BoundaryCondition(1, true, true, true, true, false, false)),
                List.of(new LoadCase("SelfWeight", LoadCaseKind.DEAD)),
                List.of(new SelfWeight("SelfWeight", 0, 0, -1)),
                loads);
    }

    private static final String REACTIONS = """
            {"Reactions":{"HEAD":["Index","Node","Load","FX","FY","FZ","MX","MY","MZ"],\
            "DATA":[["1","1","SelfWeight","0","0","490","0","0","0"]]}}""";
    private static final String DISPLACEMENTS = """
            {"Displacements":{"HEAD":["Index","Node","Load","DX","DY","DZ","RX","RY","RZ"],\
            "DATA":[["1","1","SelfWeight","0","0","0","0","0.1","0"]]}}""";

    private static MidasHttpClient client(String reactions, String displacements, List<String> log) {
        return (method, path, body) -> {
            log.add(path);
            try {
                if (path.equals("/post/table")) {
                    return MAPPER.readTree("REACTIONG".equals(body.get("Argument").get("TABLE_TYPE").asText()) ? reactions : displacements);
                }
                return MAPPER.createObjectNode();
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        };
    }

    // ---- model builder

    @Test
    void builder_refusesElasticLinks_andUniformLoads_insteadOfDroppingThem() {
        var builder = new MidasModelBuilder();
        var link = new ElasticLinkElement(5, 1, 2, 1, 1, 1, 1, 1, 1);
        var e1 = assertThrows(UnsupportedOperationException.class, () -> builder.buildCalls(request(List.of(link), List.of())));
        assertTrue(e1.getMessage().contains("elastic links"));
        var e2 = assertThrows(UnsupportedOperationException.class,
                () -> builder.buildCalls(request(List.of(), List.of(new UniformElementLoad("SelfWeight", 1, 0, 0, -5)))));
        assertTrue(e2.getMessage().contains("uniform element loads"));
        assertEquals(8, builder.buildCalls(request(List.of(), List.of())).size(), "an ordinary request is built as before");
    }

    @Test
    void engine_marksTheJobFailed_forLinksAndLoads_withoutCallingMidas() {
        var calls = new ArrayList<String>();
        var engine = new MidasCivilNxAnalysisEngine(client(REACTIONS, DISPLACEMENTS, calls));
        var link = new ElasticLinkElement(5, 1, 2, 1, 1, 1, 1, 1, 1);

        var result = engine.getResults(engine.submit(request(List.of(link), List.of())));

        assertEquals(AnalysisStatus.FAILED, result.status());
        assertTrue(result.errorMessage().contains("elastic links"));
        assertTrue(calls.isEmpty(), "nothing must be sent to MIDAS for an untranslatable model");
    }

    // ---- result extractor HEAD

    @Test
    void extractor_rejectsAMissingOrReorderedHead() throws Exception {
        var extractor = new MidasResultExtractor();
        JsonNode noHead = MAPPER.readTree("{\"Reactions\":{\"DATA\":[[\"1\",\"1\",\"L\",\"0\",\"0\",\"1\",\"0\",\"0\",\"0\"]]}}");
        assertTrue(assertThrows(MidasApiException.class, () -> extractor.parseReactions(noHead)).getMessage().contains("HEAD"));

        JsonNode swapped = MAPPER.readTree("{\"Reactions\":{\"HEAD\":[\"Index\",\"Node\",\"Load\",\"FY\",\"FX\",\"FZ\",\"MX\",\"MY\",\"MZ\"],"
                + "\"DATA\":[[\"1\",\"1\",\"L\",\"0\",\"0\",\"1\",\"0\",\"0\",\"0\"]]}}");
        var e = assertThrows(MidasApiException.class, () -> extractor.parseReactions(swapped));
        assertTrue(e.getMessage().contains("column 3"), e.getMessage());

        JsonNode shortHead = MAPPER.readTree("{\"Displacements\":{\"HEAD\":[\"Index\",\"Node\",\"Load\",\"DX\"],\"DATA\":[]}}");
        assertThrows(MidasApiException.class, () -> extractor.parseDisplacements(shortHead));
    }

    @Test
    void engine_marksTheJobFailed_whenTheHeadDoesNotMatch() {
        String swapped = REACTIONS.replace("\"FX\",\"FY\"", "\"FY\",\"FX\"");
        var engine = new MidasCivilNxAnalysisEngine(client(swapped, DISPLACEMENTS, new ArrayList<>()));
        var result = engine.getResults(engine.submit(request(List.of(), List.of())));
        assertEquals(AnalysisStatus.FAILED, result.status());
        assertTrue(result.errorMessage().contains("column 3"), result.errorMessage());
    }

    // ---- job lifecycle and serialization

    @Test
    void getResults_deliversOnce_andForgetsTheJob() throws Exception {
        var engine = new MidasCivilNxAnalysisEngine(client(REACTIONS, DISPLACEMENTS, new ArrayList<>()));
        AnalysisJobId id = engine.submit(request(List.of(), List.of()));
        assertEquals(AnalysisStatus.COMPLETED, engine.getStatus(id));
        assertEquals(1, jobCount(engine));

        assertEquals(AnalysisStatus.COMPLETED, engine.getResults(id).status());
        assertEquals(0, jobCount(engine));
        assertThrows(IllegalArgumentException.class, () -> engine.getResults(id));
    }

    @Test
    void concurrentSubmits_areQueued_neverInterleaved() throws Exception {
        AtomicInteger inFlight = new AtomicInteger();
        AtomicInteger maxInFlight = new AtomicInteger();
        // A submit is "in the MIDAS session" from its /doc/new until its displacements table has been read.
        MidasHttpClient tracking = (method, path, body) -> {
            try {
                if (path.equals("/doc/new")) {
                    maxInFlight.accumulateAndGet(inFlight.incrementAndGet(), Math::max);
                }
                Thread.sleep(5);
                if (path.equals("/post/table")) {
                    boolean reactions = "REACTIONG".equals(body.get("Argument").get("TABLE_TYPE").asText());
                    if (!reactions) {
                        inFlight.decrementAndGet();
                    }
                    return MAPPER.readTree(reactions ? REACTIONS : DISPLACEMENTS);
                }
                return MAPPER.createObjectNode();
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        };
        var engine = new MidasCivilNxAnalysisEngine(tracking);

        int threads = 6;
        CountDownLatch start = new CountDownLatch(1);
        List<Thread> pool = new ArrayList<>();
        List<AnalysisStatus> statuses = java.util.Collections.synchronizedList(new ArrayList<>());
        for (int i = 0; i < threads; i++) {
            Thread t = new Thread(() -> {
                try {
                    start.await();
                    AnalysisJobId id = engine.submit(request(List.of(), List.of()));
                    statuses.add(engine.getResults(id).status());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
            pool.add(t);
            t.start();
        }
        start.countDown();
        for (Thread t : pool) {
            t.join(30_000);
        }

        assertEquals(threads, statuses.size());
        assertTrue(statuses.stream().allMatch(s -> s == AnalysisStatus.COMPLETED));
        assertEquals(1, maxInFlight.get(), "two submits were inside the MIDAS session at the same time");
    }

    @SuppressWarnings("unchecked")
    private static int jobCount(MidasCivilNxAnalysisEngine engine) throws Exception {
        Field field = MidasCivilNxAnalysisEngine.class.getDeclaredField("jobs");
        field.setAccessible(true);
        return ((Map<?, ?>) field.get(engine)).size();
    }
}
