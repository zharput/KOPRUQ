package com.kopruq.analysis.model;

/**
 * A cross-section. Sealed to the shapes actually needed so far - solid
 * rectangle (the hand-built test beam), I-section (precast girders), and
 * solid circle (piers). Every additional shape (prestressed concrete,
 * steel girder, tapered, ...) needs its own verified schema first (see
 * docs/midas-integration-analysis.md's capability matrix). Dimensions are in metres.
 */
public sealed interface AnalysisSection permits SolidRectangleSection, ISection, SolidCircularSection {

    int id();

    String name();
}
