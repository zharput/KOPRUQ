package com.kopruq.landxml.model;

import java.util.List;

/** One {@code <ProfAlign>} (vertical profile) - {@code alignmentName} is the horizontal alignment it belongs to. */
public record LandXmlProfile(String name, String alignmentName, List<LandXmlPvi> pvis, List<String> unsupportedReasons) {

    /** A profile made only of plain PVIs (+ simple {@code <CircCurve length=.../>} markers). */
    public LandXmlProfile(String name, String alignmentName, List<LandXmlPvi> pvis) {
        this(name, alignmentName, pvis, List.of());
    }

    /**
     * True when the profile contains vertical-curve content this reader cannot interpret
     * (a {@code <CircCurve>} that carries coordinates, or any {@code <ParaCurve>} / {@code <UnsymParaCurve>}).
     * Such a profile must not be turned into a design elevation - the curve type is the engineer's decision.
     */
    public boolean hasUnsupportedCurves() {
        return !unsupportedReasons.isEmpty();
    }
}
