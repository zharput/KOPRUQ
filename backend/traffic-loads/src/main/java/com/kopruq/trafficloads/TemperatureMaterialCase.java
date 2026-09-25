package com.kopruq.trafficloads;

/** Material-specific uniform-temperature case; values stay null until verified code data is configured. */
public record TemperatureMaterialCase(
        String materialFamily,
        String applicableBridgeTypes,
        Double thermalExpansionCoefficientPerC,
        Double contractionC,
        Double expansionC,
        String parameterSource,
        String status) { }
