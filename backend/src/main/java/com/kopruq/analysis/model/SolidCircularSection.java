package com.kopruq.analysis.model;

/** Solid circular section, diameter in metres. Used for circular pier columns. */
public record SolidCircularSection(int id, String name, double diameterM) implements AnalysisSection {
}
