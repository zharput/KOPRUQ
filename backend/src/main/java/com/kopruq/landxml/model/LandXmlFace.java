package com.kopruq.landxml.model;

/** One pre-defined TIN triangle - point IDs, matching {@link LandXmlPoint#id()}. */
public record LandXmlFace(String p1, String p2, String p3) {
}
