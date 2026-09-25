package com.kopruq.landxml;

/** One {@code <PVI>} (+ an optional following {@code <CircCurve length="...">}), mirroring {@code com.kopruq.alignment.Pvi} exactly. */
public record LandXmlPvi(double chainageM, double elevationM, double curveLengthM) {
}
