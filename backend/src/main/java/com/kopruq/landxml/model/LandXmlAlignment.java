package com.kopruq.landxml.model;

import java.util.List;

/** One {@code <Alignment>}'s horizontal geometry ({@code <CoordGeom>}) - a file can contain several (main line, ramp, railway, ...); the engineer picks which to import. */
public record LandXmlAlignment(String name, List<LandXmlGeometryElement> elements, List<SkippedGeometry> skipped,
        Double staStart) {

    /** An alignment with no skipped geometry and no declared start station. */
    public LandXmlAlignment(String name, List<LandXmlGeometryElement> elements) {
        this(name, elements, List.of(), null);
    }

    public LandXmlAlignment(String name, List<LandXmlGeometryElement> elements, List<SkippedGeometry> skipped) {
        this(name, elements, skipped, null);
    }

    /**
     * True when the file declares a start station ({@code staStart}) other than 0 (or one that is not a finite
     * number). KOPRUQ's profile chainages are measured from the alignment start, so a non-zero station offset
     * would shift the profile against the horizontal geometry - how to apply it is an open engineer question.
     */
    public boolean hasUnconfirmedStationOffset() {
        return staStart != null && (!Double.isFinite(staStart) || staStart != 0);
    }

    /**
     * A {@code <CoordGeom>} child that could not be turned into geometry (a {@code <Spiral>}, or a {@code <Line>} /
     * {@code <Curve>} with missing data). Its position is kept so that a gap in the MIDDLE of the alignment (which
     * would silently join two non-adjacent pieces) can be told apart from a skipped element at the very end.
     *
     * @param kind {@code "Spiral"}, {@code "Line"} or {@code "Curve"}
     * @param position 1-based position among all CoordGeom children (kept and skipped)
     * @param keptElementsBefore how many kept {@link #elements()} precede it
     */
    public record SkippedGeometry(String kind, int position, int keptElementsBefore) {
    }

    /** Skipped elements that are followed by at least one kept element - a break inside the alignment. */
    public List<SkippedGeometry> interiorGaps() {
        return skipped.stream().filter(s -> s.keptElementsBefore() < elements.size()).toList();
    }
}
