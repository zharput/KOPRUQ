package com.kopruq.analysisengine;

import com.kopruq.analysis.AnalysisElement;
import com.kopruq.analysis.AnalysisJobId;
import com.kopruq.analysis.AnalysisMaterial;
import com.kopruq.analysis.AnalysisNode;
import com.kopruq.analysis.AnalysisRequest;
import com.kopruq.analysis.AnalysisResult;
import com.kopruq.analysis.AnalysisStatus;
import com.kopruq.analysis.BoundaryCondition;
import com.kopruq.analysis.LoadCase;
import com.kopruq.analysis.LoadCaseKind;
import com.kopruq.analysis.MaterialKind;
import com.kopruq.analysis.SelfWeight;
import com.kopruq.analysis.SolidRectangleSection;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Handler;
import java.util.logging.Level;
import java.util.logging.LogRecord;
import java.util.logging.Logger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Engine-level behavior: job lifecycle and logging of failed jobs (BACKEND-REMEDIATION Faz 3). */
class KopruqAnalysisEngineTest {

    private static final double E = 30_000_000;

    static AnalysisRequest cantilever(boolean withSupport) {
        return new AnalysisRequest(
                List.of(new AnalysisNode(1, 0, 0, 0), new AnalysisNode(2, 10, 0, 0)),
                List.of(new AnalysisElement(1, 1, 1, 1, 2)),
                List.of(),
                List.of(new AnalysisMaterial(1, MaterialKind.CONCRETE, "TEST", E, 0.2, 1e-5, 25.0, 25.0 / 9.81)),
                List.of(new SolidRectangleSection(1, "TEST", 2, 1)),
                withSupport ? List.of(new BoundaryCondition(1, true, true, true, true, true, true)) : List.of(),
                List.of(new LoadCase("SelfWeight", LoadCaseKind.DEAD)),
                List.of(new SelfWeight("SelfWeight", 0, 0, -1)),
                List.of());
    }

    @Test
    void validModel_completes() {
        var engine = new KopruqAnalysisEngine();
        AnalysisJobId id = engine.submit(cantilever(true));
        assertEquals(AnalysisStatus.COMPLETED, engine.getStatus(id));
        AnalysisResult result = engine.getResults(id);
        assertEquals(AnalysisStatus.COMPLETED, result.status());
        assertEquals(2, result.displacements().size());
    }

    @Test
    void nonFiniteSolution_isFailed_notCompleted() {
        var request = cantilever(true);
        var nanMaterial = new AnalysisMaterial(1, MaterialKind.CONCRETE, "TEST", Double.NaN, 0.2, 1e-5, 25.0, 25.0 / 9.81);
        var bad = new AnalysisRequest(request.nodes(), request.elements(), request.elasticLinks(), List.of(nanMaterial),
                request.sections(), request.supports(), request.loadCases(), request.selfWeights(), request.uniformLoads());

        var engine = new KopruqAnalysisEngine();
        AnalysisResult result = engine.getResults(engine.submit(bad));

        assertEquals(AnalysisStatus.FAILED, result.status());
        assertTrue(result.errorMessage().contains("non-finite"), result.errorMessage());
        assertTrue(result.displacements().isEmpty());
    }

    @Test
    void unconstrainedModel_isFailed_withMessage_andIsLoggedWithTheException() {
        Logger logger = Logger.getLogger(KopruqAnalysisEngine.class.getName());
        List<LogRecord> records = new ArrayList<>();
        Handler handler = new Handler() {
            @Override public void publish(LogRecord record) { records.add(record); }
            @Override public void flush() { }
            @Override public void close() { }
        };
        logger.addHandler(handler);
        try {
            var engine = new KopruqAnalysisEngine();
            AnalysisJobId id = engine.submit(cantilever(false));
            AnalysisResult result = engine.getResults(id);
            assertEquals(AnalysisStatus.FAILED, result.status());
            assertNotNull(result.errorMessage());
            assertTrue(result.errorMessage().contains("Singular") || result.errorMessage().contains("unstable"),
                    result.errorMessage());

            assertEquals(1, records.size());
            assertEquals(Level.WARNING, records.get(0).getLevel());
            assertTrue(records.get(0).getMessage().contains(id.toString()));
            assertNotNull(records.get(0).getThrown(), "the failure must be logged with its exception (stack trace)");
        } finally {
            logger.removeHandler(handler);
        }
    }
}
