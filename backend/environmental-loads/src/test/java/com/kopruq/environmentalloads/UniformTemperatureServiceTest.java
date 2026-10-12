package com.kopruq.environmentalloads;

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

    @Test
    void nonFiniteInputs_areInvalid_andReportedInMissingParameters() {
        var service = new UniformTemperatureService();
        for (double bad : new double[] {Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY}) {
            var min = service.resolve(new UniformTemperatureRequest(bad, 40.0, 10.0));
            assertEquals("INVALID", min.status());
            assertTrue(min.missingParameters().stream().anyMatch(m -> m.contains("Te,min") && m.contains("finite")));
            assertEquals(null, min.effectiveMinimumC());
            assertEquals(null, min.contractionC());

            var max = service.resolve(new UniformTemperatureRequest(-10.0, bad, 10.0));
            assertEquals("INVALID", max.status());
            assertTrue(max.missingParameters().stream().anyMatch(m -> m.contains("Te,max") && m.contains("finite")));

            var t0 = service.resolve(new UniformTemperatureRequest(-10.0, 40.0, bad));
            assertEquals("INVALID", t0.status());
            assertTrue(t0.missingParameters().stream().anyMatch(m -> m.contains("T0") && m.contains("finite")));
        }
    }

    @Test
    void validInput_keepsExistingResult() {
        var result = new UniformTemperatureService().resolve(new UniformTemperatureRequest(-10.0, 40.0, 10.0));
        assertEquals("VALID", result.status());
        assertEquals(-20.0, result.contractionC());
        assertEquals(30.0, result.expansionC());
        assertTrue(result.missingParameters().isEmpty());
    }

    @Test
    void missingValues_keepTheOriginalMessages() {
        var result = new UniformTemperatureService().resolve(new UniformTemperatureRequest(null, null, null));
        assertEquals(java.util.List.of("effectiveMinimumTemperatureC (Te,min)", "effectiveMaximumTemperatureC (Te,max)",
                "initialTemperatureC (T0)"), result.missingParameters());
    }
}
