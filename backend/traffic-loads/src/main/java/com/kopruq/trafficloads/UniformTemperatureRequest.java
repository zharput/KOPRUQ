package com.kopruq.trafficloads;

public record UniformTemperatureRequest(Double effectiveMinimumTemperatureC, Double effectiveMaximumTemperatureC, Double initialTemperatureC) { }
