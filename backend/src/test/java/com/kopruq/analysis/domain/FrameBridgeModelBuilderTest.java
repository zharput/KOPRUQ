package com.kopruq.analysis.domain;

import com.kopruq.analysis.model.AnalysisRequest;
import com.kopruq.analysis.model.FrameBridgeInput;
import com.kopruq.analysis.model.FrameBridgeModel;
import com.kopruq.analysis.model.NamedNode;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FrameBridgeModelBuilderTest {

    private final FrameBridgeModelBuilder builder = new FrameBridgeModelBuilder();

    /** The engineer 5-span example (same values as the frontend defaults). */
    static FrameBridgeInput fiveSpan() {
        return new FrameBridgeInput(
                List.of(30.0, 40.0, 50.0, 40.0, 25.0), 15.0, 1.0, 10.0,
                List.of(10.0, 15.0, 20.0, 8.0), 2.0, 4.0, 8.0, 3.0, 1.5, 30.0,
                3000.0, 30000.0, 100000.0, 100000.0, 100000.0, 100000.0);
    }

    static FrameBridgeInput singleSpan() {
        return new FrameBridgeInput(
                List.of(30.0), 15.0, 1.0, 10.0,
                List.of(), 2.0, 4.0, 8.0, 3.0, 1.5, 30.0,
                3000.0, 30000.0, 100000.0, 100000.0, 100000.0, 100000.0);
    }

    @Test
    void fiveSpan_buildsThePortalFrameTopology() {
        FrameBridgeModel model = builder.build(fiveSpan());
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
        assertEquals(List.of("C1", "P1", "P2", "P3", "P4", "C2"), model.deckNodes().stream().map(NamedNode::label).toList());
        assertEquals(List.of("C1", "P1-Left", "P1-Right", "P2-Left", "P2-Right", "P3-Left", "P3-Right",
                "P4-Left", "P4-Right", "C2"), model.supportNodes().stream().map(NamedNode::label).toList());
        assertEquals(List.of(0.0, 30.0, 70.0, 120.0, 160.0, 185.0),
                model.deckNodes().stream().map(NamedNode::chainageM).toList());
    }

    @Test
    void singleSpan_hasOnlyTheTwoAbutments() {
        FrameBridgeModel model = builder.build(singleSpan());
        AnalysisRequest r = model.analysisRequest();

        // 2 deck nodes + 2 substructure-top nodes, no piers
        assertEquals(4, r.nodes().size());
        assertEquals(1, r.elements().size());
        assertEquals(2, r.elasticLinks().size());
        assertEquals(2, r.supports().size());
        assertEquals(1, r.uniformLoads().size());
        assertEquals(List.of("C1", "C2"), model.deckNodes().stream().map(NamedNode::label).toList());
        assertEquals(List.of("C1", "C2"), model.supportNodes().stream().map(NamedNode::label).toList());
    }

    @Test
    void concreteMaterialIsNamedAfterFck_andTheSdlIsAppliedDownwards() {
        FrameBridgeModel model = builder.build(fiveSpan());
        AnalysisRequest r = model.analysisRequest();

        assertEquals("C30", r.materials().get(0).name());
        // sdlKnPerM = 10.0 acts as a -10.0 kN/m vertical load on every deck span
        for (var load : r.uniformLoads()) {
            assertEquals(-10.0, load.wzKnPerM(), 0.0);
            assertEquals(0.0, load.wxKnPerM(), 0.0);
            assertEquals(0.0, load.wyKnPerM(), 0.0);
        }
    }
}
