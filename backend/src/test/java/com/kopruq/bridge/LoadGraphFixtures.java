package com.kopruq.bridge;

import com.kopruq.bridge.enums.ParameterProvenance;
import com.kopruq.bridge.model.GraphConnection;
import com.kopruq.bridge.model.GraphDocument;
import com.kopruq.bridge.model.GraphGroup;
import com.kopruq.bridge.model.GraphNode;
import com.kopruq.bridge.model.GraphNodeParameter;
import com.kopruq.bridge.model.GraphParameterValue.GraphBooleanValue;
import com.kopruq.bridge.model.GraphParameterValue.GraphNumberListValue;
import com.kopruq.bridge.model.GraphParameterValue.GraphNumberValue;
import com.kopruq.bridge.model.GraphParameterValue.GraphStringValue;
import com.kopruq.bridge.model.Lm1LaneFactor;
import com.kopruq.bridge.model.Lm1ParameterValue;
import com.kopruq.bridge.model.SeismicInputs;
import com.kopruq.bridge.model.SeismicInputsSection;
import com.kopruq.bridge.model.SelfWeightInputs;
import com.kopruq.bridge.model.SelfWeightInputsSection;
import com.kopruq.bridge.model.TemperatureInputs;
import com.kopruq.bridge.model.TemperatureInputsSection;
import com.kopruq.bridge.model.TrafficLm1Inputs;
import com.kopruq.bridge.model.TrafficLm1Section;
import com.kopruq.bridge.model.WindInputs;
import com.kopruq.bridge.model.WindInputsSection;
import com.kopruq.bridge.model.WindSnapshot;
import com.kopruq.bridge.model.WindSnapshotInputs;
import com.kopruq.bridge.model.WindSnapshotSection;

import java.util.List;

/**
 * Fixtures for the M3 sections (load inputs and graph documents). The numbers and texts are arbitrary test data that
 * exercise the storage edge cases (negative, zero, 0.1 + 0.2, Unicode, empty strings, nulls); they are not
 * engineering data.
 */
public final class LoadGraphFixtures {

    private LoadGraphFixtures() {
    }

    public static SeismicInputsSection seismic() {
        return new SeismicInputsSection(new SeismicInputs("0.4", "Z", "Tip ş", ""));
    }

    public static WindInputsSection wind() {
        return new WindInputsSection(new WindInputs("27", "II", "abc"));
    }

    public static TemperatureInputsSection temperature() {
        return new TemperatureInputsSection(new TemperatureInputs("-17", "", "10°"));
    }

    public static SelfWeightInputsSection selfWeight() {
        return new SelfWeightInputsSection(new SelfWeightInputs(0.30000000000000004, -24.0, 0.0, 25.0, 2.0, 0.7,
                0.08, 25.0, 2.0, 2.0, 2.0, 1.5, 2.0, 1.0, 1.0, 1.0));
    }

    public static TrafficLm1Section trafficLm1() {
        return new TrafficLm1Section(trafficLm1Inputs());
    }

    public static TrafficLm1Inputs trafficLm1Inputs() {
        return new TrafficLm1Inputs(
                List.of(lane("Q1k", 300.0, ParameterProvenance.CODE_DEFAULT, 300.0, 0.9,
                                ParameterProvenance.PROJECT_OVERRIDE, 1.0),
                        lane("Q1k", -1.0, ParameterProvenance.NATIONAL_ANNEX, null, 0.0,
                                ParameterProvenance.CODE_DEFAULT, null)),
                List.of(),
                lane("qrk", null, ParameterProvenance.NATIONAL_ANNEX, null, 1.0, ParameterProvenance.CODE_DEFAULT,
                        1.0));
    }

    public static Lm1LaneFactor lane(String label, Double value, ParameterProvenance provenance, Double codeDefault,
            Double adjustment, ParameterProvenance adjustmentProvenance, Double adjustmentDefault) {
        return new Lm1LaneFactor(label, new Lm1ParameterValue(value, provenance, codeDefault),
                new Lm1ParameterValue(adjustment, adjustmentProvenance, adjustmentDefault));
    }

    public static WindSnapshotSection windSnapshot() {
        return new WindSnapshotSection(new WindSnapshot(1, "VALID",
                new WindSnapshotInputs("27", "II", "10", 13.8, 0.30000000000000004)));
    }

    public static WindSnapshotSection windSnapshotWithoutStatus() {
        return new WindSnapshotSection(new WindSnapshot(1, null, new WindSnapshotInputs("", "", "", 0.0, -3.0)));
    }

    /** A full graph: all four parameter kinds (empty array too), a group, owner ids, odd node types and ports. */
    public static GraphDocument graph(String id) {
        GraphNode n1 = new GraphNode("n-1", "input.number", "Number ç", 0.30000000000000004, -12.5, List.of(
                new GraphNodeParameter("value", new GraphNumberValue(5.0)),
                new GraphNodeParameter("enabled", new GraphBooleanValue(false)),
                new GraphNodeParameter("unit", new GraphStringValue("")),
                new GraphNodeParameter("list", new GraphNumberListValue(List.of(1.0, 2.5, 0.0, -3.0))),
                new GraphNodeParameter("none", new GraphNumberListValue(List.of())),
                new GraphNodeParameter("", new GraphStringValue("empty key is legal"))));
        GraphNode n2 = new GraphNode("n-2", "not.in.registry", "", 100.0, 0.0, List.of());
        return new GraphDocument(id, "Bridge B-1", 1, "P-2026", "b-1", List.of(n1, n2),
                List.of(new GraphConnection("e-1", "n-1", "value", "n-2", "no-such-port")),
                List.of(new GraphGroup("group-001", "Group 1", List.of("n-1", "n-2"), "#5C7C99"),
                        new GraphGroup("group-001", "Same id again", List.of(), "")));
    }

    /** A minimal graph without owner ids and with {@code groups} null (the field is absent). */
    public static GraphDocument emptyGraph(String id, List<GraphGroup> groups) {
        return new GraphDocument(id, "", 1, null, null, List.of(), List.of(), groups);
    }
}
