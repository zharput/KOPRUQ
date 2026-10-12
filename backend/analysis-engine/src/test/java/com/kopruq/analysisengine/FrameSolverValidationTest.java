package com.kopruq.analysisengine;

import com.kopruq.analysis.AnalysisElement;
import com.kopruq.analysis.AnalysisMaterial;
import com.kopruq.analysis.AnalysisNode;
import com.kopruq.analysis.AnalysisRequest;
import com.kopruq.analysis.AnalysisResult;
import com.kopruq.analysis.AnalysisStatus;
import com.kopruq.analysis.BoundaryCondition;
import com.kopruq.analysis.ElasticLinkElement;
import com.kopruq.analysis.LoadCase;
import com.kopruq.analysis.SelfWeight;
import com.kopruq.analysis.SolidRectangleSection;
import com.kopruq.analysis.UniformElementLoad;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * BACKEND-REMEDIATION Faz 8: the solver refuses requests it would otherwise silently mis-handle, and the engine
 * hands a result over exactly once.
 */
class FrameSolverValidationTest {

    private static final AnalysisMaterial MATERIAL = new AnalysisMaterial(1, "CONC", "TEST", 30_000_000, 0.2, 1e-5, 25.0, 25.0 / 9.81);
    private static final SolidRectangleSection SECTION = new SolidRectangleSection(1, "TEST", 2, 1);

    private static AnalysisRequest request(List<AnalysisNode> nodes, List<AnalysisElement> elements,
            List<BoundaryCondition> supports, List<LoadCase> loadCases, List<SelfWeight> selfWeights,
            List<UniformElementLoad> loads) {
        return new AnalysisRequest(nodes, elements, List.of(), List.of(MATERIAL), List.of(SECTION), supports,
                loadCases, selfWeights, loads);
    }

    private static final List<AnalysisNode> TWO_NODES = List.of(new AnalysisNode(1, 0, 0, 0), new AnalysisNode(2, 10, 0, 0));
    private static final List<AnalysisElement> ONE_ELEMENT = List.of(new AnalysisElement(1, 1, 1, 1, 2));
    private static final List<BoundaryCondition> FIXED_1 = List.of(new BoundaryCondition(1, true, true, true, true, true, true));
    private static final List<LoadCase> ONE_CASE = List.of(new LoadCase("Service", "D"));
    private static final List<SelfWeight> SW = List.of(new SelfWeight("Service", 0, 0, -1));

    private static AnalysisRequest valid() {
        return request(TWO_NODES, ONE_ELEMENT, FIXED_1, ONE_CASE, SW, List.of());
    }

    private static String message(AnalysisRequest request) {
        return assertThrows(IllegalArgumentException.class, () -> FrameSolver.solve(request)).getMessage();
    }

    @Test
    void validRequest_solves() {
        assertDoesNotThrow(() -> FrameSolver.solve(valid()));
    }

    @Test
    void supportOnAnUnknownNode_isRejected() {
        var bad = request(TWO_NODES, ONE_ELEMENT, List.of(new BoundaryCondition(99, true, true, true, true, true, true)),
                ONE_CASE, SW, List.of());
        assertEquals("Support refers to unknown node id: 99", message(bad));
    }

    @Test
    void duplicateIds_areRejected() {
        var dupNode = request(List.of(new AnalysisNode(1, 0, 0, 0), new AnalysisNode(1, 10, 0, 0)), ONE_ELEMENT, FIXED_1, ONE_CASE, SW, List.of());
        assertEquals("Duplicate node id: 1", message(dupNode));

        var dupElement = request(TWO_NODES, List.of(new AnalysisElement(1, 1, 1, 1, 2), new AnalysisElement(1, 1, 1, 2, 1)),
                FIXED_1, ONE_CASE, SW, List.of());
        assertEquals("Duplicate element id: 1", message(dupElement));

        var dupMaterial = new AnalysisRequest(TWO_NODES, ONE_ELEMENT, List.of(), List.of(MATERIAL, MATERIAL), List.of(SECTION),
                FIXED_1, ONE_CASE, SW, List.of());
        assertEquals("Duplicate material id: 1", message(dupMaterial));

        var dupSection = new AnalysisRequest(TWO_NODES, ONE_ELEMENT, List.of(), List.of(MATERIAL), List.of(SECTION, SECTION),
                FIXED_1, ONE_CASE, SW, List.of());
        assertEquals("Duplicate section id: 1", message(dupSection));

        var link = new ElasticLinkElement(5, 1, 2, 1, 1, 1, 1, 1, 1);
        var dupLink = new AnalysisRequest(TWO_NODES, ONE_ELEMENT, List.of(link, link), List.of(MATERIAL), List.of(SECTION),
                FIXED_1, ONE_CASE, SW, List.of());
        assertEquals("Duplicate elastic link id: 5", message(dupLink));
    }

    @Test
    void moreThanOneLoadCase_isRejected() {
        var two = request(TWO_NODES, ONE_ELEMENT, FIXED_1,
                List.of(new LoadCase("Service", "D"), new LoadCase("Wind", "W")), SW, List.of());
        assertTrue(message(two).startsWith("The native solver supports exactly one load case, got 2"));
    }

    @Test
    void loadsNamingAnUndefinedLoadCase_areRejected() {
        var swUnknown = request(TWO_NODES, ONE_ELEMENT, FIXED_1, ONE_CASE, List.of(new SelfWeight("Other", 0, 0, -1)), List.of());
        assertEquals("Self-weight refers to unknown load case: Other", message(swUnknown));

        var udlUnknown = request(TWO_NODES, ONE_ELEMENT, FIXED_1, ONE_CASE, SW,
                List.of(new UniformElementLoad("Other", 1, 0, 0, -5)));
        assertTrue(message(udlUnknown).contains("unknown load case: Other"));

        var noCaseButLoad = request(TWO_NODES, ONE_ELEMENT, FIXED_1, List.of(), SW, List.of());
        assertTrue(message(noCaseButLoad).contains("unknown load case"));
    }

    @Test
    void matchingLoadCaseName_isAccepted() {
        var ok = request(TWO_NODES, ONE_ELEMENT, FIXED_1, ONE_CASE, SW, List.of(new UniformElementLoad("Service", 1, 0, 0, -5)));
        assertDoesNotThrow(() -> FrameSolver.solve(ok));
    }

    // ---- section / link invariants

    @Test
    void sectionAndLinkRecords_rejectInvalidNumbers() {
        assertThrows(IllegalArgumentException.class, () -> new SolidRectangleSection(1, "x", 0, 1));
        assertThrows(IllegalArgumentException.class, () -> new SolidRectangleSection(1, "x", 1, -1));
        assertThrows(IllegalArgumentException.class, () -> new SolidRectangleSection(1, "x", Double.NaN, 1));
        assertThrows(IllegalArgumentException.class, () -> new SolidRectangleSection(1, "x", 1, Double.POSITIVE_INFINITY));
        assertThrows(IllegalArgumentException.class, () -> new ElasticLinkElement(1, 1, 2, Double.NaN, 1, 1, 1, 1, 1));
        assertThrows(IllegalArgumentException.class, () -> new ElasticLinkElement(1, 1, 2, 1, 1, 1, 1, 1, Double.NEGATIVE_INFINITY));
        assertDoesNotThrow(() -> new ElasticLinkElement(1, 1, 2, 0, -1, 1, 0, 0, 0)); // no sign / range rule
    }

    // ---- engine: FAILED with a clear message, one-time result delivery

    @Test
    void engine_reportsEachRejectionAsFailedWithTheMessage() {
        var engine = new KopruqAnalysisEngine();
        AnalysisResult unknownSupport = engine.getResults(engine.submit(request(TWO_NODES, ONE_ELEMENT,
                List.of(new BoundaryCondition(7, true, true, true, true, true, true)), ONE_CASE, SW, List.of())));
        assertEquals(AnalysisStatus.FAILED, unknownSupport.status());
        assertEquals("Support refers to unknown node id: 7", unknownSupport.errorMessage());

        AnalysisResult multi = engine.getResults(engine.submit(request(TWO_NODES, ONE_ELEMENT, FIXED_1,
                List.of(new LoadCase("A", "D"), new LoadCase("B", "D")), SW, List.of())));
        assertEquals(AnalysisStatus.FAILED, multi.status());
        assertTrue(multi.errorMessage().contains("exactly one load case"));
    }

    @Test
    void engine_deliversTheResultOnce_andThenForgetsTheJob() throws Exception {
        var engine = new KopruqAnalysisEngine();
        var id = engine.submit(valid());
        assertEquals(AnalysisStatus.COMPLETED, engine.getStatus(id));
        assertEquals(1, jobCount(engine));

        assertEquals(AnalysisStatus.COMPLETED, engine.getResults(id).status());
        assertEquals(0, jobCount(engine), "the finished job must not be kept after delivery");
        assertThrows(IllegalArgumentException.class, () -> engine.getResults(id));
        assertThrows(IllegalArgumentException.class, () -> engine.getStatus(id));
    }

    @Test
    void engine_failedJobsAreAlsoForgottenAfterDelivery() throws Exception {
        var engine = new KopruqAnalysisEngine();
        var id = engine.submit(request(TWO_NODES, ONE_ELEMENT, List.of(), ONE_CASE, SW, List.of()));
        assertEquals(AnalysisStatus.FAILED, engine.getResults(id).status());
        assertEquals(0, jobCount(engine));
    }

    @SuppressWarnings("unchecked")
    private static int jobCount(KopruqAnalysisEngine engine) throws Exception {
        Field field = KopruqAnalysisEngine.class.getDeclaredField("jobs");
        field.setAccessible(true);
        return ((Map<?, ?>) field.get(engine)).size();
    }
}
