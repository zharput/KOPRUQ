package com.spanova.landxml;

import java.util.List;

/** One {@code <ProfAlign>} (vertical profile) - {@code alignmentName} is the horizontal alignment it belongs to. */
public record LandXmlProfile(String name, String alignmentName, List<LandXmlPvi> pvis) {
}
