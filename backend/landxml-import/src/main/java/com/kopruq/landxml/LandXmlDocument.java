package com.kopruq.landxml;

import java.util.List;

/**
 * The result of parsing (not yet mapping/committing) a LandXML file -
 * everything the import-preview screen needs to show the engineer
 * before they pick which surface/alignment/profile to actually import
 * (LANDXML-P01, docs/roadmap.md section 24-26 - never auto-import
 * everything when multiple alternatives exist).
 */
public record LandXmlDocument(
        LandXmlUnits units,
        CrsStatus crsStatus,
        String crsLabel,
        List<LandXmlSurface> surfaces,
        List<LandXmlAlignment> alignments,
        List<LandXmlProfile> profiles,
        List<String> warnings, String application, String formatVersion) {
}
