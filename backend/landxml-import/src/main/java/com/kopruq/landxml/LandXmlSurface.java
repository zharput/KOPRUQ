package com.kopruq.landxml;

import java.util.List;

/** One {@code <Surface>} - a LandXML file can contain several (Existing Ground, Design Surface, ...); the engineer picks which to import. */
public record LandXmlSurface(String name, List<LandXmlPoint> points, List<LandXmlFace> faces,
        List<LandXmlBoundary> boundaries, List<LandXmlBreakline> breaklines,
        int invalidPoints, int invalidFaces) {
    public LandXmlSurface(String name, List<LandXmlPoint> points, List<LandXmlFace> faces) {
        this(name, points, faces, List.of(), List.of(), 0, 0);
    }
}
