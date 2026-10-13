package com.kopruq.bridge.model;

import com.kopruq.bridge.enums.GraphParameterKind;
import com.kopruq.bridge.enums.ParameterProvenance;
import com.kopruq.bridge.model.GraphParameterValue.GraphNumberListValue;
import com.kopruq.bridge.model.GraphParameterValue.GraphNumberValue;
import com.kopruq.bridge.model.GraphParameterValue.GraphStringValue;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static com.kopruq.bridge.LoadGraphFixtures.graph;
import static com.kopruq.bridge.LoadGraphFixtures.lane;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Structural invariants of the M3 load-input and graph models (never engineering rules). */
class LoadGraphSectionsTest {

    private static final Lm1LaneFactor LANE = lane("x", 1.0, ParameterProvenance.CODE_DEFAULT, null, 1.0,
            ParameterProvenance.CODE_DEFAULT, null);

    private static GraphNode node(String id) {
        return new GraphNode(id, "t", "n", 0.0, 0.0, List.of());
    }

    private static GraphDocument document(List<GraphNode> nodes, List<GraphConnection> connections,
            List<GraphGroup> groups) {
        return new GraphDocument("g", "name", 1, null, null, nodes, connections, groups);
    }

    @Test
    void textInputs_mustBePresent_butMayBeEmptyOrNonNumeric() {
        assertDoesNotThrow(() -> new SeismicInputs("abc", "", "Z", "-1"));
        assertDoesNotThrow(() -> new WindInputs("", "", ""));
        assertDoesNotThrow(() -> new TemperatureInputs("x", "y", "z"));
        assertThrows(IllegalArgumentException.class, () -> new SeismicInputs(null, "", "", ""));
        assertThrows(IllegalArgumentException.class, () -> new WindInputs("", null, ""));
        assertThrows(IllegalArgumentException.class, () -> new TemperatureInputs("", "", null));
    }

    @Test
    void selfWeight_acceptsNegativeAndZero_rejectsNonFinite() {
        assertDoesNotThrow(() -> new SelfWeightInputs(-1, 0, -0.0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
        assertThrows(IllegalArgumentException.class,
                () -> new SelfWeightInputs(Double.NaN, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
        assertThrows(IllegalArgumentException.class,
                () -> new SelfWeightInputs(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, Double.POSITIVE_INFINITY));
    }

    @Test
    void lm1_valueMayBeNull_provenanceMayNot_labelsMayRepeat() {
        assertDoesNotThrow(() -> new Lm1ParameterValue(null, ParameterProvenance.NATIONAL_ANNEX, null));
        assertDoesNotThrow(() -> new Lm1ParameterValue(-1.0, ParameterProvenance.CODE_DEFAULT, 0.0));
        assertThrows(IllegalArgumentException.class, () -> new Lm1ParameterValue(1.0, null, null));
        assertThrows(IllegalArgumentException.class,
                () -> new Lm1ParameterValue(Double.NaN, ParameterProvenance.CODE_DEFAULT, null));
        assertThrows(IllegalArgumentException.class,
                () -> new Lm1ParameterValue(1.0, ParameterProvenance.CODE_DEFAULT, Double.NEGATIVE_INFINITY));
        assertDoesNotThrow(() -> new TrafficLm1Inputs(List.of(LANE, LANE), List.of(), LANE));
    }

    @Test
    void lm1_requiresListsLabelAndRemainingArea_andNoNullElements() {
        Lm1ParameterValue value = new Lm1ParameterValue(1.0, ParameterProvenance.CODE_DEFAULT, null);
        assertThrows(IllegalArgumentException.class, () -> new Lm1LaneFactor(null, value, value));
        assertThrows(IllegalArgumentException.class, () -> new Lm1LaneFactor("l", null, value));
        assertThrows(IllegalArgumentException.class, () -> new Lm1LaneFactor("l", value, null));
        assertThrows(IllegalArgumentException.class, () -> new TrafficLm1Inputs(null, List.of(), LANE));
        assertThrows(IllegalArgumentException.class, () -> new TrafficLm1Inputs(List.of(), null, LANE));
        assertThrows(IllegalArgumentException.class, () -> new TrafficLm1Inputs(List.of(), List.of(), null));
        assertThrows(IllegalArgumentException.class,
                () -> new TrafficLm1Inputs(Arrays.asList(LANE, null), List.of(), LANE));
    }

    @Test
    void windSnapshot_schemaVersionMustBeOne_inputsRequired_statusOptional() {
        WindSnapshotInputs inputs = new WindSnapshotInputs("", "", "", 0.0, 0.0);
        assertDoesNotThrow(() -> new WindSnapshot(1, null, inputs));
        assertThrows(IllegalArgumentException.class, () -> new WindSnapshot(2, null, inputs));
        assertThrows(IllegalArgumentException.class, () -> new WindSnapshot(0, null, inputs));
        assertThrows(IllegalArgumentException.class, () -> new WindSnapshot(1, "VALID", null));
        assertThrows(IllegalArgumentException.class, () -> new WindSnapshotInputs("", "", "", Double.NaN, 0.0));
        assertThrows(IllegalArgumentException.class, () -> new WindSnapshotInputs("", "", "", 0.0, Double.NaN));
        assertThrows(IllegalArgumentException.class, () -> new WindSnapshotInputs(null, "", "", 0.0, 0.0));
    }

    @Test
    void graphParameterValues_reportTheirKind_andRejectBadContent() {
        assertEquals(GraphParameterKind.NUMBER, new GraphNumberValue(1).kind());
        assertEquals(GraphParameterKind.NUMBER_ARRAY, new GraphNumberListValue(List.of()).kind());
        assertThrows(IllegalArgumentException.class, () -> new GraphNumberValue(Double.NaN));
        assertThrows(IllegalArgumentException.class, () -> new GraphStringValue(null));
        assertThrows(IllegalArgumentException.class,
                () -> new GraphNumberListValue(Arrays.asList(1.0, null)));
        assertThrows(IllegalArgumentException.class,
                () -> new GraphNumberListValue(List.of(1.0, Double.POSITIVE_INFINITY)));
    }

    @Test
    void graphNode_idMustNotBeBlank_parameterKeysMustBeUnique() {
        assertThrows(IllegalArgumentException.class, () -> node(""));
        assertThrows(IllegalArgumentException.class, () -> node(null));
        assertDoesNotThrow(() -> new GraphNode("n", "any.type", "", 1.0, 1.0,
                List.of(new GraphNodeParameter("", new GraphNumberValue(1)))));
        assertThrows(IllegalArgumentException.class, () -> new GraphNode("n", "t", "n", 0.0, 0.0,
                List.of(new GraphNodeParameter("k", new GraphNumberValue(1)),
                        new GraphNodeParameter("k", new GraphStringValue("v")))));
        assertThrows(IllegalArgumentException.class, () -> new GraphNode("n", "t", "n", Double.NaN, 0.0, List.of()));
        assertThrows(IllegalArgumentException.class,
                () -> new GraphNode("n", "t", "n", 0.0, Double.POSITIVE_INFINITY, List.of()));
    }

    @Test
    void graphDocument_nodeAndConnectionIdsMustBeUniqueAndNotBlank() {
        assertThrows(IllegalArgumentException.class, () -> document(List.of(node("a"), node("a")), List.of(), null));
        GraphConnection c = new GraphConnection("e", "a", "p", "a", "q");
        assertThrows(IllegalArgumentException.class,
                () -> document(List.of(node("a")), List.of(c, c), null));
        assertThrows(IllegalArgumentException.class, () -> new GraphConnection("", "a", "p", "a", "q"));
    }

    @Test
    void graphDocument_connectionsAndGroupsMustReferToExistingNodes() {
        assertThrows(IllegalArgumentException.class, () -> document(List.of(node("a")),
                List.of(new GraphConnection("e", "ghost", "p", "a", "q")), null));
        assertThrows(IllegalArgumentException.class, () -> document(List.of(node("a")),
                List.of(new GraphConnection("e", "a", "p", "ghost", "q")), null));
        assertThrows(IllegalArgumentException.class, () -> document(List.of(node("a")), List.of(),
                List.of(new GraphGroup("g", "n", List.of("a", "ghost"), "c"))));
    }

    @Test
    void graphDocument_acceptsRepeatedGroupIds_unknownPortsAndRepeatedMembers() {
        GraphDocument d = document(List.of(node("a"), node("b")),
                List.of(new GraphConnection("e", "a", "no-such-port", "b", "nor-this")),
                List.of(new GraphGroup("group-1", "x", List.of("a", "a"), ""),
                        new GraphGroup("group-1", "y", List.of(), "")));
        assertEquals(2, d.groups().size());
    }

    @Test
    void graphDocument_schemaVersionMustBeOne_nullAndEmptyGroupsDiffer() {
        assertThrows(IllegalArgumentException.class,
                () -> new GraphDocument("g", "n", 2, null, null, List.of(), List.of(), null));
        assertThrows(IllegalArgumentException.class,
                () -> new GraphDocument("", "n", 1, null, null, List.of(), List.of(), null));
        assertNull(document(List.of(), List.of(), null).groups());
        assertEquals(List.of(), document(List.of(), List.of(), List.of()).groups());
    }

    @Test
    void graphDocument_rejectsNullListsAndNullElements() {
        assertThrows(IllegalArgumentException.class, () -> document(null, List.of(), null));
        assertThrows(IllegalArgumentException.class, () -> document(List.of(), null, null));
        assertThrows(IllegalArgumentException.class, () -> document(Arrays.asList(node("a"), null), List.of(), null));
        List<GraphGroup> withNull = new ArrayList<>();
        withNull.add(null);
        assertThrows(IllegalArgumentException.class, () -> document(List.of(), List.of(), withNull));
    }

    @Test
    void graphDocument_listsAreImmutableCopies() {
        List<GraphNode> nodes = new ArrayList<>(List.of(node("a")));
        GraphDocument d = document(nodes, List.of(), null);
        nodes.add(node("b"));
        assertEquals(1, d.nodes().size());
        assertThrows(UnsupportedOperationException.class, () -> d.nodes().add(node("c")));
        assertEquals(graph("g"), graph("g"));
    }

    @Test
    void enums_matchByExactConstantName() {
        assertEquals(Optional.of(ParameterProvenance.NATIONAL_ANNEX), ParameterProvenance.fromValue("NATIONAL_ANNEX"));
        assertEquals(Optional.empty(), ParameterProvenance.fromValue("national_annex"));
        assertEquals(Optional.of(GraphParameterKind.NUMBER_ARRAY), GraphParameterKind.fromValue("NUMBER_ARRAY"));
        assertEquals(Optional.empty(), GraphParameterKind.fromValue("number[]"));
    }
}
