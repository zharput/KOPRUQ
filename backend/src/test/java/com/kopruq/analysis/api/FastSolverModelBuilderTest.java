package com.kopruq.analysis.api;

import com.kopruq.analysis.model.AnalysisRequest;
import com.kopruq.analysis.model.FrameBridgeModel;
import com.kopruq.analysis.model.NamedNode;
import com.kopruq.shared.exception.FieldViolation;
import com.kopruq.shared.exception.InvalidRequestException;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** BACKEND-REMEDIATION Faz 4: model topology (characterization) and request validation. */
class FastSolverModelBuilderTest {

    private final FastSolverModelBuilder builder = new FastSolverModelBuilder();

    /** The engineer's 5-span example (same values as the frontend defaults). */
    static FastSolverRequest valid() {
        return new FastSolverRequest(
                List.of(30.0, 40.0, 50.0, 40.0, 25.0), 15.0, 1.0, 10.0,
                List.of(10.0, 15.0, 20.0, 8.0), 2.0, 4.0, 8.0, 3.0, 1.5, 30.0,
                3000.0, 30000.0, 100000.0, 100000.0, 100000.0, 100000.0);
    }

    private static FastSolverRequest with(java.util.function.UnaryOperator<Builder> change) {
        return change.apply(new Builder(valid())).build();
    }

    /** Minimal copy-with helper over the record. */
    private static final class Builder {
        List<Double> spans, piers;
        Double deckWidth, deckThickness, sdl, colL, colT, colS, capW, capD, fck, kx, ky, kz, krx, kry, krz;

        Builder(FastSolverRequest r) {
            spans = r.spanLengthsM(); piers = r.pierHeightsM(); deckWidth = r.deckWidthM(); deckThickness = r.deckThicknessM();
            sdl = r.sdlKnPerM(); colL = r.columnLongitudinalM(); colT = r.columnTransverseM(); colS = r.columnSpacingTransverseM();
            capW = r.capBeamWidthM(); capD = r.capBeamDepthM(); fck = r.concreteFckMpa();
            kx = r.bearingKx(); ky = r.bearingKy(); kz = r.bearingKz(); krx = r.bearingKrx(); kry = r.bearingKry(); krz = r.bearingKrz();
        }

        FastSolverRequest build() {
            return new FastSolverRequest(spans, deckWidth, deckThickness, sdl, piers, colL, colT, colS, capW, capD, fck,
                    kx, ky, kz, krx, kry, krz);
        }
    }

    private Set<String> violatedFields(FastSolverRequest request) {
        InvalidRequestException e = assertThrows(InvalidRequestException.class, () -> builder.build(request));
        return e.violations().stream().map(FieldViolation::field).collect(Collectors.toSet());
    }

    @Test
    void validRequest_buildsTheFiveSpanPortalFrameTopology() {
        FrameBridgeModel model = builder.build(valid());
        AnalysisRequest r = model.analysisRequest();

        // 6 deck nodes (C1,P1..P4,C2), 6 substructure-top nodes, 4 piers x 4 column nodes
        assertEquals(6 + 6 + 4 * 4, r.nodes().size());
        // 5 deck spans + 4 piers x (2 columns + 2 cap-beam segments)
        assertEquals(5 + 4 * 4, r.elements().size());
        assertEquals(6, r.elasticLinks().size());
        assertEquals(2 + 4 * 2, r.supports().size());
        assertEquals(5, r.uniformLoads().size());
        assertEquals(1, r.materials().size());
        assertEquals("C30", r.materials().get(0).name());
        assertEquals(3, r.sections().size());
        assertEquals(List.of("C1", "P1", "P2", "P3", "P4", "C2"),
                model.deckNodes().stream().map(NamedNode::label).toList());
        assertEquals(List.of("C1", "P1-Left", "P1-Right", "P2-Left", "P2-Right", "P3-Left", "P3-Right",
                "P4-Left", "P4-Right", "C2"), model.supportNodes().stream().map(NamedNode::label).toList());
        assertEquals(List.of(0.0, 30.0, 70.0, 120.0, 160.0, 185.0),
                model.deckNodes().stream().map(NamedNode::chainageM).toList());
        assertEquals(-10.0, r.uniformLoads().get(0).wzKnPerM(), 0);
    }

    @Test
    void sdlAndBearingValues_haveNoSignOrRangeRule() {
        FastSolverRequest r = with(b -> { b.sdl = -5.0; b.kx = 0.0; b.krz = -1.0; return b; });
        assertEquals(5, builder.build(r).analysisRequest().uniformLoads().size());
    }

    @Test
    void everyMissingNumericField_isReportedByItsJsonName() {
        FastSolverRequest empty = new FastSolverRequest(null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null);
        assertEquals(Set.of("spanLengthsM", "pierHeightsM", "deckWidthM", "deckThicknessM", "sdlKnPerM",
                "columnLongitudinalM", "columnTransverseM", "columnSpacingTransverseM", "capBeamWidthM", "capBeamDepthM",
                "concreteFckMpa", "bearingKx", "bearingKy", "bearingKz", "bearingKrx", "bearingKry", "bearingKrz"),
                violatedFields(empty));
    }

    @Test
    void allViolationsAreCollected_notJustTheFirst() {
        FastSolverRequest r = with(b -> { b.deckWidth = -1.0; b.sdl = null; b.fck = 0.0; b.kz = Double.NaN; return b; });
        assertEquals(Set.of("deckWidthM", "sdlKnPerM", "concreteFckMpa", "bearingKz"), violatedFields(r));
    }

    @Test
    void nonFiniteValues_areRejected() {
        for (double bad : new double[] {Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY}) {
            assertEquals(Set.of("deckThicknessM"), violatedFields(with(b -> { b.deckThickness = bad; return b; })));
            assertEquals(Set.of("sdlKnPerM"), violatedFields(with(b -> { b.sdl = bad; return b; })));
            assertEquals(Set.of("bearingKx"), violatedFields(with(b -> { b.kx = bad; return b; })));
        }
    }

    @Test
    void nonPositiveDimensionsAndFck_areRejected() {
        assertEquals(Set.of("deckWidthM"), violatedFields(with(b -> { b.deckWidth = 0.0; return b; })));
        assertEquals(Set.of("columnLongitudinalM"), violatedFields(with(b -> { b.colL = -2.0; return b; })));
        assertEquals(Set.of("concreteFckMpa"), violatedFields(with(b -> { b.fck = -8.0; return b; })));
        assertEquals(Set.of("capBeamDepthM"), violatedFields(with(b -> { b.capD = 0.0; return b; })));
    }

    @Test
    void spanAndPierLists_areValidatedElementByElement() {
        assertEquals(Set.of("spanLengthsM[1]"), violatedFields(with(b -> {
            b.spans = Arrays.asList(30.0, null, 50.0, 40.0, 25.0); return b; })));
        assertEquals(Set.of("spanLengthsM[2]"), violatedFields(with(b -> {
            b.spans = List.of(30.0, 40.0, -50.0, 40.0, 25.0); return b; })));
        assertEquals(Set.of("pierHeightsM[3]"), violatedFields(with(b -> {
            b.piers = List.of(10.0, 15.0, 20.0, 0.0); return b; })));
        assertEquals(Set.of("spanLengthsM"), violatedFields(with(b -> {
            b.spans = List.of(); b.piers = List.of(); return b; })));
    }

    @Test
    void pierCountMustMatchSpanCountMinusOne() {
        InvalidRequestException e = assertThrows(InvalidRequestException.class,
                () -> builder.build(with(b -> { b.piers = List.of(10.0, 15.0); return b; })));
        assertEquals(1, e.violations().size());
        assertEquals("pierHeightsM", e.violations().get(0).field());
        assertTrue(e.violations().get(0).message().contains("spanCount - 1"));
    }

    @Test
    void singleSpan_hasNoPiers() {
        FastSolverRequest r = with(b -> { b.spans = List.of(30.0); b.piers = List.of(); return b; });
        AnalysisRequest req = builder.build(r).analysisRequest();
        assertEquals(2 + 2, req.nodes().size());
        assertEquals(1, req.elements().size());
        assertEquals(2, req.supports().size());
    }
}
