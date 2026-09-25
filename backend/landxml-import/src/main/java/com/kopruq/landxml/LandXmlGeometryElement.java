package com.kopruq.landxml;

/**
 * One {@code <CoordGeom>} element. {@code <Spiral>} (transition curves)
 * is deliberately not a permitted variant here - it's parsed-and-
 * skipped with a warning (see {@link LandXmlParser}), not silently
 * misread, since spirals need the engineer's own clothoid
 * parameterization convention (spec section 22) before they can be
 * supported at all.
 */
public sealed interface LandXmlGeometryElement permits LandXmlLine, LandXmlCurve {
}
