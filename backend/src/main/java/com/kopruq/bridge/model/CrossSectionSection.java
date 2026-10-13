package com.kopruq.bridge.model;

/** The cross-section section; null {@code values} means "cleared / not set". */
public record CrossSectionSection(CrossSectionValues values) implements ProjectSection {
}
