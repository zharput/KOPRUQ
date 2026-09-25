package com.kopruq.trafficloads;

import java.util.List;

public record UniformTemperatureResult(
        Double initialTemperatureC,
        Double effectiveMinimumC,
        Double effectiveMaximumC,
        Double contractionC,
        Double expansionC,
        String thermalExpansionSource,
        String standard,
        String parameterSource,
        String status,
        List<String> missingParameters,
        Double concreteAlphaTPerC,
        Double steelAlphaTPerC,
        String temperatureActionStatus,
        String concreteAlphaStatus,
        String steelAlphaStatus) { }
