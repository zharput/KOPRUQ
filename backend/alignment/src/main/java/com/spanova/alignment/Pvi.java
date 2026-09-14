package com.spanova.alignment;

/**
 * A Point of Vertical Intersection - one grade-break point in a
 * {@link VerticalProfile} (LANDXML-P01, docs/roadmap.md), mirroring
 * LandXML's own {@code <ProfAlign><PVI>chainage elevation</PVI>...}
 * shape directly (a PVI, optionally followed by a
 * {@code <CircCurve length="..."/>} applying a parabolic vertical curve
 * centered at that PVI).
 *
 * <p>{@code curveLengthM = 0} means no vertical curve at this PVI (a
 * sharp grade break) - standard for the first/last PVI, optional for
 * intermediate ones.
 */
public record Pvi(double chainageM, double elevationM, double curveLengthM) {
}
