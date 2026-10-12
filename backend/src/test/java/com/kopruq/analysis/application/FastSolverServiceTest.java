package com.kopruq.analysis.application;

import com.kopruq.analysis.domain.AppliedLoadSummary;
import com.kopruq.analysis.domain.FrameBridgeModelBuilder;
import com.kopruq.analysis.enums.AnalysisStatus;
import com.kopruq.analysis.infra.nativeengine.KopruqAnalysisEngine;
import com.kopruq.analysis.model.AnalysisJobId;
import com.kopruq.analysis.model.AnalysisRequest;
import com.kopruq.analysis.model.AnalysisResult;
import com.kopruq.analysis.model.DisplacementResult;
import com.kopruq.analysis.model.FrameBridgeInput;
import com.kopruq.analysis.model.FrameBridgeModel;
import com.kopruq.analysis.model.NamedNode;
import com.kopruq.analysis.model.ReactionResult;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FastSolverServiceTest {

    private static FrameBridgeModel fiveSpanModel() {
        return new FrameBridgeModelBuilder().build(new FrameBridgeInput(
                List.of(30.0, 40.0, 50.0, 40.0, 25.0), 15.0, 1.0, 10.0,
                List.of(10.0, 15.0, 20.0, 8.0), 2.0, 4.0, 8.0, 3.0, 1.5, 30.0,
                3000.0, 30000.0, 100000.0, 100000.0, 100000.0, 100000.0));
    }

    /** An engine that hands back whatever the test builds from the request. */
    private record FakeEngine(Function<AnalysisRequest, AnalysisResult> result) implements AnalysisEngine {
        private static final AnalysisJobId JOB = new AnalysisJobId(UUID.randomUUID());
        private static AnalysisRequest last;

        @Override
        public AnalysisJobId submit(AnalysisRequest request) {
            last = request;
            return JOB;
        }

        @Override
        public AnalysisStatus getStatus(AnalysisJobId jobId) {
            return AnalysisStatus.COMPLETED;
        }

        @Override
        public AnalysisResult getResults(AnalysisJobId jobId) {
            return result.apply(last);
        }

        @Override
        public void cancel(AnalysisJobId jobId) {
        }
    }

    private static List<ReactionResult> reactionsFor(FrameBridgeModel model, int skipIndex) {
        List<ReactionResult> reactions = new ArrayList<>();
        for (int i = 0; i < model.supportNodes().size(); i++) {
            if (i != skipIndex) {
                reactions.add(new ReactionResult(model.supportNodes().get(i).nodeId(), 0, 0, 100.0 + i, 0, 0, 0));
            }
        }
        return reactions;
    }

    private static List<DisplacementResult> displacementsFor(FrameBridgeModel model) {
        List<DisplacementResult> out = new ArrayList<>();
        for (NamedNode n : model.deckNodes()) {
            out.add(new DisplacementResult(n.nodeId(), 0, 0, -0.01, 0, 0, 0));
        }
        return out;
    }

    @Test
    void aMissingReaction_failsTheRun_namingTheSupport() {
        FrameBridgeModel model = fiveSpanModel();
        var service = new FastSolverService(new FakeEngine(r -> new AnalysisResult(
                AnalysisStatus.COMPLETED, reactionsFor(model, 0), displacementsFor(model), null)));

        FastSolverOutcome outcome = service.solve(model);

        assertEquals("FAILED", outcome.status());
        assertEquals("The solver returned no reaction for support C1", outcome.errorMessage());
        assertTrue(outcome.supportReactions().isEmpty());
        assertTrue(outcome.deckDisplacements().isEmpty());
        assertEquals(0, outcome.totalAppliedLoadKn());
        assertEquals(0, outcome.totalReactionKn());
    }

    @Test
    void aMissingDisplacement_failsTheRun_namingTheDeckNode() {
        FrameBridgeModel model = fiveSpanModel();
        var service = new FastSolverService(new FakeEngine(r -> new AnalysisResult(
                AnalysisStatus.COMPLETED, reactionsFor(model, -1), List.of(), null)));

        FastSolverOutcome outcome = service.solve(model);

        assertEquals("FAILED", outcome.status());
        assertEquals("The solver returned no displacement for deck node C1", outcome.errorMessage());
    }

    @Test
    void aStatusOtherThanCompleted_isPassedThroughWithItsMessage() {
        FrameBridgeModel model = fiveSpanModel();
        var service = new FastSolverService(new FakeEngine(r -> new AnalysisResult(
                AnalysisStatus.FAILED, List.of(), List.of(), "singular stiffness matrix")));

        FastSolverOutcome outcome = service.solve(model);

        assertEquals("FAILED", outcome.status());
        assertEquals("singular stiffness matrix", outcome.errorMessage());
        assertTrue(outcome.supportReactions().isEmpty());
    }

    @Test
    void aCompletedRun_sumsTheSupportFz_inSupportOrder_andReportsTheAppliedLoad() {
        FrameBridgeModel model = fiveSpanModel();
        var service = new FastSolverService(new FakeEngine(r -> new AnalysisResult(
                AnalysisStatus.COMPLETED, reactionsFor(model, -1), displacementsFor(model), null)));

        FastSolverOutcome outcome = service.solve(model);

        assertEquals("COMPLETED", outcome.status());
        assertNull(outcome.errorMessage());
        assertEquals(10, outcome.supportReactions().size());
        assertEquals(6, outcome.deckDisplacements().size());
        assertEquals("C1", outcome.supportReactions().get(0).node().label());
        double expectedSum = 0;
        for (int i = 0; i < 10; i++) {
            expectedSum += 100.0 + i;
        }
        assertEquals(expectedSum, outcome.totalReactionKn(), 0.0);
        assertEquals(AppliedLoadSummary.totalAppliedLoadKn(model.analysisRequest()), outcome.totalAppliedLoadKn(), 0.0);
    }

    @Test
    void withTheNativeEngine_theTotalsMatchTheContractSnapshot_andEquilibriumHolds() {
        FastSolverOutcome outcome = new FastSolverService(new KopruqAnalysisEngine()).solve(fiveSpanModel());

        assertEquals("COMPLETED", outcome.status());
        assertEquals(96025.0, outcome.totalAppliedLoadKn(), 96025.0 * 1e-9);
        assertEquals(outcome.totalAppliedLoadKn(), outcome.totalReactionKn(), outcome.totalAppliedLoadKn() * 1e-9);
        assertEquals(4527.651567354706, outcome.supportReactions().get(0).reaction().fz(), 4527.651567354706 * 1e-9);
    }
}
