package com.kopruq.landxml;

/** One TIN surface point. {@code id} matches a {@link LandXmlFace}'s point references. */
public record LandXmlPoint(String id, double x, double y, double z) {
}
