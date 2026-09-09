package com.spanova.analysis;

/**
 * MIDAS "Value" section, shape "H" (an I/H-section allowing different
 * top and bottom flange widths - fits an asymmetric precast girder).
 * Fillet radii are not modelled (MIDAS defaults them to 0) - a drawing
 * simplification, not a structural assumption.
 */
public record ISection(
        int id,
        String name,
        double heightM,
        double topFlangeWidthM,
        double topFlangeThicknessM,
        double bottomFlangeWidthM,
        double bottomFlangeThicknessM,
        double webThicknessM) implements AnalysisSection {
}
