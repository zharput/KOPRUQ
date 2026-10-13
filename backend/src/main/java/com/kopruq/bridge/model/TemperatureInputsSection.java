package com.kopruq.bridge.model;

/** The temperature-inputs section; null {@code inputs} means "cleared / not set". */
public record TemperatureInputsSection(TemperatureInputs inputs) implements ProjectSection {
}
