package com.kopruq.analysis;

/**
 * A cross-section. Sealed to the shapes actually needed so far - solid
 * rectangle (MIDAS-P01's test beam), I-section (precast girders), and
 * solid circle (piers). Every additional MIDAS section shape (PSC,
 * steel girder, tapered, ...) needs its own verified schema first (see
 * docs/MIDAS_INTEGRATION_ANALYSIS.md's capability matrix).
 */
public sealed interface AnalysisSection permits SolidRectangleSection, ISection, SolidCircularSection {

    int id();

    String name();
}
