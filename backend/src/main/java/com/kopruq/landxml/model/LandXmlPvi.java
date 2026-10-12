package com.kopruq.landxml.model;

/** One {@code <PVI>} (+ an optional following {@code <CircCurve length="...">}), mirroring {@code com.kopruq.alignment.model.Pvi} exactly. */
public record LandXmlPvi(double chainageM, double elevationM, double curveLengthM) {
}
