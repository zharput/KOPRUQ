package com.kopruq.analysis;

/**
 * I/H section allowing different top and bottom flange widths - fits an
 * asymmetric precast girder. Dimensions in metres. Fillet radii are not
 * modelled - a drawing simplification, not a structural assumption.
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
