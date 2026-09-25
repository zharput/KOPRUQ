package com.kopruq.trafficloads;

import java.util.ArrayList;
import java.util.List;

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
        if (lanes != null && !lanes.lanes().isEmpty() && lanes.lanes().size() < 3
                && (lanes.lanes().size() * NotionalLaneGenerator.CONFIRMED_LANE_WIDTH_M + lanes.remainingAreaWidthM())
                        < NotionalLaneGenerator.NARROW_CARRIAGEWAY_THRESHOLD_M) {
            warnings.add("Carriageway is narrower than 6 m - EN 1991-2 Table 4.1's narrow-carriageway special case "
                    + "is not implemented yet, only the general 3.00 m/lane rule; confirm the lane count manually for this case.");
        }

        return new TrafficValidationResult(carriagewayDefined, notionalLanesGenerated, lm1Resolved, warnings);
    }

    private static boolean allResolved(Lm1Parameters lm1) {
        return lm1.tandemSystem().stream().allMatch(f -> f.effectiveValue() != null)
                && lm1.udl().stream().allMatch(f -> f.effectiveValue() != null)
                && lm1.remainingAreaUdl().effectiveValue() != null;
    }
}
