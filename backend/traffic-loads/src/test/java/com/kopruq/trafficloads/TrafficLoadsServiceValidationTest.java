package com.kopruq.trafficloads;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * BACKEND-REMEDIATION Faz 5: LM1 / carriageway validation. {@code TrafficLoadsServiceTest}
 * (the original four tests) is intentionally untouched and must keep passing.
 */
class TrafficLoadsServiceValidationTest {

    private final TrafficLoadsService service = new TrafficLoadsService();
    private final NotionalLaneGenerator laneGenerator = new NotionalLaneGenerator();
    private final Lm1DefaultsFactory defaults = new Lm1DefaultsFactory();

    private static ParameterValue<Double> code(double v) {
        return new ParameterValue<>(v, ParameterProvenance.CODE_DEFAULT, v);
    }

    private static LaneFactor row(String label) {
        return new LaneFactor(label, code(10.0), code(1.0));
    }

    private NotionalLaneResult wideLanes() {
        return laneGenerator.generate(new CarriagewayInput(13.80, 1.00, 1.50));
    }

    private boolean hasLm1Warning(TrafficValidationResult result) {
        return result.warnings().stream().anyMatch(w -> w.contains("LM1 characteristic values"));
    }

    @Test
    void emptyTandemOrUdlList_isNotResolved_andWarns() {
        var noTandem = new Lm1Parameters(List.of(), List.of(row("q1k")), row("qrk"));
        var noUdl = new Lm1Parameters(List.of(row("Q1k")), List.of(), row("qrk"));
        var nothing = new Lm1Parameters(List.of(), List.of(), row("qrk"));
        for (Lm1Parameters lm1 : List.of(noTandem, noUdl, nothing)) {
            TrafficValidationResult result = service.validate(wideLanes(), lm1);
            assertFalse(result.lm1Resolved());
            assertTrue(hasLm1Warning(result));
        }
    }

    @Test
    void nullListNullRowNullParameterOrNullRemainingRow_isNotResolved_andNeverThrows() {
        var ok = List.of(row("Q1k"));
        var nullList = new Lm1Parameters(null, ok, row("qrk"));
        var nullRow = new Lm1Parameters(Arrays.asList((LaneFactor) null), ok, row("qrk"));
        var nullRemaining = new Lm1Parameters(ok, ok, null);
        var nullParameter = new Lm1Parameters(
                List.of(new LaneFactor("Q1k", null, code(1.0))), ok, row("qrk"));
        var nullFactor = new Lm1Parameters(
                ok, List.of(new LaneFactor("q1k", code(9.0), null)), row("qrk"));
        for (Lm1Parameters lm1 : List.of(nullList, nullRow, nullRemaining, nullParameter, nullFactor)) {
            TrafficValidationResult result = service.validate(wideLanes(), lm1);
            assertFalse(result.lm1Resolved());
            assertTrue(hasLm1Warning(result));
        }
    }

    @Test
    void laneFactorWithNullParameterValue_hasNoEffectiveValue() {
        assertNull(new LaneFactor("x", null, code(1.0)).effectiveValue());
        assertNull(new LaneFactor("x", code(1.0), null).effectiveValue());
        assertNull(new LaneFactor("x", null, null).effectiveValue());
    }

    @Test
    void codeDefaultCodeValues_stayResolvedWithoutWarning() {
        TrafficValidationResult result = service.validate(wideLanes(), defaults.codeDefaults(3));
        assertTrue(result.lm1Resolved());
        assertTrue(result.warnings().isEmpty());
    }

    @Test
    void codeDefaultProvenanceWithADifferentValue_warns_butStaysResolved() {
        var changed = new LaneFactor("Q1k", new ParameterValue<>(250.0, ParameterProvenance.CODE_DEFAULT, 300.0), code(1.0));
        var lm1 = new Lm1Parameters(List.of(changed), List.of(row("q1k")), row("qrk"));

        TrafficValidationResult result = service.validate(wideLanes(), lm1);

        assertTrue(result.lm1Resolved(), "a provenance mismatch is a warning only, not a resolution failure");
        assertEquals(1, result.warnings().size());
        assertTrue(result.warnings().get(0).contains("Q1k"));
        assertTrue(result.warnings().get(0).contains("CODE_DEFAULT"));
    }

    @Test
    void projectOverrideWithADifferentValue_doesNotWarn() {
        var overridden = new LaneFactor("Q1k", new ParameterValue<>(250.0, ParameterProvenance.PROJECT_OVERRIDE, 300.0), code(1.0));
        var lm1 = new Lm1Parameters(List.of(overridden), List.of(row("q1k")), row("qrk"));
        TrafficValidationResult result = service.validate(wideLanes(), lm1);
        assertTrue(result.lm1Resolved());
        assertTrue(result.warnings().isEmpty());
    }

    @Test
    void narrowCarriagewayWarning_isGiven_forZeroLanes_andForVeryNarrowOrNegativeWidth() {
        for (CarriagewayInput input : List.of(
                new CarriagewayInput(0, 0, 0), new CarriagewayInput(2.0, 0, 0),
                new CarriagewayInput(5.0, 0, 0), new CarriagewayInput(5.99, 0, 0),
                new CarriagewayInput(3.0, 2.0, 2.0))) {
            NotionalLaneResult lanes = laneGenerator.generate(input);
            TrafficValidationResult result = service.validate(lanes, null);
            assertTrue(result.warnings().stream().anyMatch(w -> w.contains("narrower than 6 m")), input.toString());
        }
    }

    @Test
    void sixMetreCarriageway_hasNoNarrowWarning() {
        NotionalLaneResult lanes = laneGenerator.generate(new CarriagewayInput(6.0, 0, 0));
        assertEquals(2, lanes.lanes().size());
        assertTrue(service.validate(lanes, null).warnings().isEmpty());
    }

    @Test
    void zeroLanes_markNotionalLanesNotGenerated() {
        NotionalLaneResult lanes = laneGenerator.generate(new CarriagewayInput(0, 0, 0));
        assertFalse(service.validate(lanes, null).notionalLanesGenerated());
    }

    @Test
    void carriagewayInput_rejectsNonFiniteValues() {
        for (double bad : new double[] {Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY}) {
            assertThrows(IllegalArgumentException.class, () -> new CarriagewayInput(bad, 0, 0));
            assertThrows(IllegalArgumentException.class, () -> new CarriagewayInput(10, bad, 0));
            assertThrows(IllegalArgumentException.class, () -> new CarriagewayInput(10, 0, bad));
        }
        assertEquals(13.8 - 1.0 - 1.5, new CarriagewayInput(13.8, 1.0, 1.5).carriagewayWidthM(), 1e-12);
    }
}
