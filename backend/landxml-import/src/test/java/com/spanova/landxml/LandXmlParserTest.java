package com.spanova.landxml;

import org.junit.jupiter.api.Test;

import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LandXmlParserTest {

    private final LandXmlParser parser = new LandXmlParser();

    private static InputStream sampleFile() {
        InputStream stream = LandXmlParserTest.class.getResourceAsStream("/sample.landxml");
        if (stream == null) {
            throw new IllegalStateException("test fixture sample.landxml not found on classpath");
        }
        return stream;
    }

    @Test
    void parsesUnitsAndCoordinateSystem() {
        LandXmlDocument document = parser.parse(sampleFile());

        assertEquals("meter", document.units().linearUnit());
        assertEquals(CrsStatus.RESOLVED, document.crsStatus());
        assertEquals("EPSG:32635", document.crsLabel());
    }

    @Test
    void parsesSurfacePointsWithNorthingEastingElevationOrder() {
        LandXmlDocument document = parser.parse(sampleFile());

        assertEquals(1, document.surfaces().size());
        LandXmlSurface surface = document.surfaces().get(0);
        assertEquals("Existing Ground", surface.name());
        assertEquals(4, surface.points().size());

        // <P id="1">0 0 2.0</P> is "Northing Easting Elevation" -> X=Easting=0, Y=Northing=0, Z=2.0.
        LandXmlPoint p1 = surface.points().get(0);
        assertEquals("1", p1.id());
        assertEquals(0, p1.x());
        assertEquals(0, p1.y());
        assertEquals(2.0, p1.z());

        // <P id="2">0 10 7.0</P> -> Northing=0, Easting=10 -> X=10, Y=0.
        LandXmlPoint p2 = surface.points().get(1);
        assertEquals(10, p2.x());
        assertEquals(0, p2.y());
        assertEquals(7.0, p2.z());

        assertEquals(2, surface.faces().size());
        assertEquals(new LandXmlFace("1", "2", "3"), surface.faces().get(0));
        assertEquals(new LandXmlFace("1", "3", "4"), surface.faces().get(1));
    }

    @Test
    void parsesAlignmentLineAndCurveAndSkipsSpiralWithWarning() {
        LandXmlDocument document = parser.parse(sampleFile());

        assertEquals(1, document.alignments().size());
        LandXmlAlignment alignment = document.alignments().get(0);
        assertEquals("Main Alignment", alignment.name());
        assertEquals(2, alignment.elements().size(), "Spiral must be skipped, not counted as a geometry element");

        LandXmlLine line = (LandXmlLine) alignment.elements().get(0);
        assertEquals(0, line.startX());
        assertEquals(0, line.startY());
        assertEquals(100, line.endX());
        assertEquals(0, line.endY());

        LandXmlCurve curve = (LandXmlCurve) alignment.elements().get(1);
        assertEquals(100, curve.startX());
        assertEquals(0, curve.startY());
        assertEquals(150, curve.endX());
        assertEquals(50, curve.endY());
        assertEquals(100, curve.centerX());
        assertEquals(50, curve.centerY());
        assertEquals(50, curve.radiusM());
        assertEquals(false, curve.clockwise());

        assertTrue(document.warnings().stream().anyMatch(w -> w.contains("Spiral")),
                "expected a warning about the skipped <Spiral>");
    }

    @Test
    void parsesProfilePvisAndAssociatesThemWithTheirAlignment() {
        LandXmlDocument document = parser.parse(sampleFile());

        assertEquals(1, document.profiles().size());
        LandXmlProfile profile = document.profiles().get(0);
        assertEquals("Design Profile", profile.name());
        assertEquals("Main Alignment", profile.alignmentName());
        assertEquals(3, profile.pvis().size());

        assertEquals(new LandXmlPvi(0, 100, 0), profile.pvis().get(0));
        assertEquals(new LandXmlPvi(100, 105, 40), profile.pvis().get(1), "CircCurve length must attach to the preceding PVI");
        assertEquals(new LandXmlPvi(200, 100, 0), profile.pvis().get(2));
    }
}
