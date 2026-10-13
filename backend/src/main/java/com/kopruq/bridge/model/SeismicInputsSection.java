package com.kopruq.bridge.model;

/** The seismic-inputs section; null {@code inputs} means "cleared / not set". */
public record SeismicInputsSection(SeismicInputs inputs) implements ProjectSection {
}
