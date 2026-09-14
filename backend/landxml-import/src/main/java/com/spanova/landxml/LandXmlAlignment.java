package com.spanova.landxml;

import java.util.List;

/** One {@code <Alignment>}'s horizontal geometry ({@code <CoordGeom>}) - a file can contain several (main line, ramp, railway, ...); the engineer picks which to import. */
public record LandXmlAlignment(String name, List<LandXmlGeometryElement> elements) {
}
