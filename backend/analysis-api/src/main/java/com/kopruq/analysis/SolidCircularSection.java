package com.kopruq.analysis;

/** MIDAS "Value" section, shape "SR" (solid circle). Used for circular pier columns. */
public record SolidCircularSection(int id, String name, double diameterM) implements AnalysisSection {
}
