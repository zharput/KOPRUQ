package com.kopruq.bridge.model;

/** The self-weight-inputs section; null {@code inputs} means "cleared / not set". */
public record SelfWeightInputsSection(SelfWeightInputs inputs) implements ProjectSection {
}
