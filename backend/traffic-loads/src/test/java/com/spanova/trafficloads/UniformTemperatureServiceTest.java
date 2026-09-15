package com.spanova.trafficloads;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class UniformTemperatureServiceTest {
    @Test
    void calculatesApprovedProjectEffectiveTemperatures() {
        var result = new UniformTemperatureService().resolve(new UniformTemperatureRequest(-30.0, 45.0, 12.0));
        assertEquals("VALID", result.status());
        assertEquals(-42.0, result.contractionC());
        assertEquals(33.0, result.expansionC());
    }

    @Test
    void rejectsReversedAirTemperatureRange() {
        var result = new UniformTemperatureService().resolve(new UniformTemperatureRequest(40.0, -20.0, 10.0));
        assertTrue(result.missingParameters().contains("Te,min must be less than Te,max"));
    }
}
