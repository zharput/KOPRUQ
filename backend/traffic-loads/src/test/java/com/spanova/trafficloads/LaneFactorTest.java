package com.spanova.trafficloads;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class LaneFactorTest {

    @Test
    void effectiveValue_multipliesCharacteristicByAdjustmentFactor_whenBothConfirmed() {
        var characteristic = new ParameterValue<>(300.0, ParameterProvenance.CODE_DEFAULT, 300.0);
        var factor = new ParameterValue<>(1.0, ParameterProvenance.NATIONAL_ANNEX, 1.0);
        var laneFactor = new LaneFactor("Lane 1 - Tandem System (Q1k)", characteristic, factor);

        assertEquals(300.0, laneFactor.effectiveValue(), 1e-9);
    }

    @Test
    void effectiveValue_isNull_whenCharacteristicValueIsUnconfirmed() {
        var characteristic = new ParameterValue<Double>(null, ParameterProvenance.CODE_DEFAULT, null);
        var factor = new ParameterValue<>(1.0, ParameterProvenance.NATIONAL_ANNEX, 1.0);
        var laneFactor = new LaneFactor("Lane 1 - Tandem System (Q1k)", characteristic, factor);

        assertNull(laneFactor.effectiveValue());
    }

    @Test
    void restoringCodeValue_isJustReadingCodeDefaultValueBackIntoValue() {
        var overridden = new ParameterValue<>(250.0, ParameterProvenance.PROJECT_OVERRIDE, 300.0);

        var restored = new ParameterValue<>(overridden.codeDefaultValue(), ParameterProvenance.CODE_DEFAULT, overridden.codeDefaultValue());

        assertEquals(300.0, restored.value(), 1e-9);
        assertEquals(ParameterProvenance.CODE_DEFAULT, restored.provenance());
    }
}
