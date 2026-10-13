package com.kopruq.bridge.model;

/** The wind-inputs section; null {@code inputs} means "cleared / not set". */
public record WindInputsSection(WindInputs inputs) implements ProjectSection {
}
