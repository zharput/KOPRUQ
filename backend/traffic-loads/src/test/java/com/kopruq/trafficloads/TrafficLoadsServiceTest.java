package com.kopruq.trafficloads;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrafficLoadsServiceTest {

    private final TrafficLoadsService service = new TrafficLoadsService();
    private final NotionalLaneGenerator laneGenerator = new NotionalLaneGenerator();
    private final Lm1DefaultsFactory lm1DefaultsFactory = new Lm1DefaultsFactory();

    @Test
    void validate_acceptsEnBaseLm1_withoutWarning() {
        NotionalLaneResult lanes = laneGenerator.generate(new CarriagewayInput(13.80, 1.00, 1.50));
        Lm1Parameters unconfirmedLm1 = lm1DefaultsFactory.codeDefaults(3);

        TrafficValidationResult result = service.validate(lanes, unconfirmedLm1);

        assertTrue(result.carriagewayDefined());
        assertTrue(result.notionalLanesGenerated());
        assertTrue(result.lm1Resolved());
        assertFalse(result.warnings().stream().anyMatch(w -> w.contains("LM1")));
    }

    @Test
    void validate_reportsLm1Resolved_whenEveryValueIsConfirmed() {
        NotionalLaneResult lanes = laneGenerator.generate(new CarriagewayInput(13.80, 1.00, 1.50));
        LaneFactor confirmedRow = new LaneFactor("Lane 1", confirmed(300.0), confirmed(1.0));
        Lm1Parameters resolvedLm1 = new Lm1Parameters(
                java.util.List.of(confirmedRow), java.util.List.of(confirmedRow), confirmedRow);

        TrafficValidationResult result = service.validate(lanes, resolvedLm1);

        assertTrue(result.lm1Resolved());
        assertFalse(result.warnings().stream().anyMatch(w -> w.contains("LM1")));
    }

    @Test
    void validate_warnsOnNarrowCarriageway_belowSixMetres() {
        NotionalLaneResult narrowLanes = laneGenerator.generate(new CarriagewayInput(5.00, 0, 0));

        TrafficValidationResult result = service.validate(narrowLanes, null);

        assertTrue(result.warnings().stream().anyMatch(w -> w.contains("narrower than 6 m")));
    }

    @Test
    void validate_doesNotWarnAboutNarrowCarriageway_whenThreeOrMoreLanesGenerated() {
        NotionalLaneResult wideLanes = laneGenerator.generate(new CarriagewayInput(13.80, 1.00, 1.50));

        TrafficValidationResult result = service.validate(wideLanes, null);

        assertFalse(result.warnings().stream().anyMatch(w -> w.contains("narrower than 6 m")));
    }

    private static ParameterValue<Double> confirmed(double value) {
        return new ParameterValue<>(value, ParameterProvenance.CODE_DEFAULT, value);
    }
}
