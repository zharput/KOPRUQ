package com.spanova.analysis;

/** MIDAS "Value" section, shape "SB". Used by MIDAS-P01's hand-built test beam. */
public record SolidRectangleSection(int id, String name, double heightM, double widthM) implements AnalysisSection {
}
