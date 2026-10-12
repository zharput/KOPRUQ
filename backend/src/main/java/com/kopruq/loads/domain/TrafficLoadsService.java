package com.kopruq.loads.domain;

import java.util.ArrayList;
import java.util.List;
import com.kopruq.loads.enums.ParameterProvenance;
import com.kopruq.loads.model.CarriagewayInput;
import com.kopruq.loads.model.LaneFactor;
import com.kopruq.loads.model.Lm1Parameters;
import com.kopruq.loads.model.NotionalLaneResult;
import com.kopruq.loads.model.ParameterValue;
import com.kopruq.loads.model.TrafficValidationResult;

/**
 * TRAFFIC-P01 orchestrator (docs/roadmap.md) - generates notional
 * lanes and validates the current traffic model. Deliberately thin:
 * the real per-concern logic lives in {@link NotionalLaneGenerator}/
 * {@link Lm1DefaultsFactory}, this class just composes them, same
 * shape as other single-purpose backend services in this app
 * ({@code TerrainQueryService}, {@code VerticalProfile}).
 */
public final class TrafficLoadsService {

    private final NotionalLaneGenerator laneGenerator = new NotionalLaneGenerator();

    public NotionalLaneResult generateLanes(CarriagewayInput input) {
        return laneGenerator.generate(input);
    }

    public TrafficValidationResult validate(NotionalLaneResult lanes, Lm1Parameters lm1) {
        boolean carriagewayDefined = lanes != null;
        boolean notionalLanesGenerated = lanes != null && !lanes.lanes().isEmpty();
        boolean lm1Resolved = lm1 != null && allResolved(lm1);

        List<String> warnings = new ArrayList<>();
        if (lm1 != null && !lm1Resolved) {
            warnings.add("LM1 characteristic values (Q1k/Q2k/Q3k, q1k/q2k/q3k, qrk) are not yet confirmed - "
                    + "EN 1991-2 Table 4.2 values are required from the engineer before this model is ready for analysis.");
        }
        // Also true for zero generated lanes (e.g. a 0 m or negative carriageway): that is the narrowest case of all.
        if (lanes != null
                && (lanes.lanes().size() * NotionalLaneGenerator.CONFIRMED_LANE_WIDTH_M + lanes.remainingAreaWidthM())
                        < NotionalLaneGenerator.NARROW_CARRIAGEWAY_THRESHOLD_M) {
            warnings.add("Carriageway is narrower than 6 m - EN 1991-2 Table 4.1's narrow-carriageway special case "
                    + "is not implemented yet, only the general 3.00 m/lane rule; confirm the lane count manually for this case.");
        }

        if (lm1 != null) {
            warnings.addAll(codeDefaultOverrideWarnings(lm1));
        }

        return new TrafficValidationResult(carriagewayDefined, notionalLanesGenerated, lm1Resolved, warnings);
    }

    /**
     * LM1 is resolved only if it has at least one Tandem System row and one UDL row, a remaining-area
     * row, and every row has an effective value. An empty list is NOT "vacuously resolved", and a
     * null list / row / parameter is "not resolved" instead of an exception.
     */
    private static boolean allResolved(Lm1Parameters lm1) {
        return rowsResolved(lm1.tandemSystem()) && rowsResolved(lm1.udl())
                && lm1.remainingAreaUdl() != null && lm1.remainingAreaUdl().effectiveValue() != null;
    }

    private static boolean rowsResolved(List<LaneFactor> rows) {
        return rows != null && !rows.isEmpty()
                && rows.stream().allMatch(row -> row != null && row.effectiveValue() != null);
    }

    /** A CODE_DEFAULT parameter whose value differs from its own code default is flagged, never silently accepted. */
    private static List<String> codeDefaultOverrideWarnings(Lm1Parameters lm1) {
        List<String> warnings = new ArrayList<>();
        List<LaneFactor> all = new ArrayList<>();
        if (lm1.tandemSystem() != null) all.addAll(lm1.tandemSystem());
        if (lm1.udl() != null) all.addAll(lm1.udl());
        all.add(lm1.remainingAreaUdl());
        for (LaneFactor row : all) {
            if (row == null) continue;
            checkProvenance(warnings, row.label(), "characteristic value", row.characteristicValue());
            checkProvenance(warnings, row.label(), "adjustment factor", row.adjustmentFactor());
        }
        return warnings;
    }

    private static void checkProvenance(List<String> warnings, String label, String what, ParameterValue<Double> parameter) {
        if (parameter == null || parameter.provenance() != ParameterProvenance.CODE_DEFAULT) return;
        if (parameter.value() != null && parameter.codeDefaultValue() != null
                && Double.compare(parameter.value(), parameter.codeDefaultValue()) != 0) {
            warnings.add("LM1 " + label + ": the " + what + " is marked CODE_DEFAULT but differs from the code default value ("
                    + parameter.value() + " vs " + parameter.codeDefaultValue() + ") - confirm whether it is a project override.");
        }
    }
}
