package com.spanova.landxml;

/** {@code linearUnit} is the raw LandXML value (e.g. "meter", "USSurveyFoot") - null if no {@code <Units>} element was found. Never silently assumed. */
public record LandXmlUnits(String linearUnit) {
}
