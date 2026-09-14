package com.spanova.landxml;

/** A circular arc ({@code rot="cw"|"ccw"} -> {@code clockwise}), same shape as LandXML's own redundant Start/Center/End/radius representation. */
public record LandXmlCurve(
        double startX, double startY,
        double endX, double endY,
        double centerX, double centerY,
        double radiusM, boolean clockwise) implements LandXmlGeometryElement {
}
