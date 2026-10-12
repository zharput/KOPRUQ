package com.kopruq.loads.model;

public record UniformTemperatureRequest(Double effectiveMinimumTemperatureC, Double effectiveMaximumTemperatureC, Double initialTemperatureC) { }
