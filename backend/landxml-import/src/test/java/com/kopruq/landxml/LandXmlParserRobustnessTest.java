package com.kopruq.landxml;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * BACKEND-REMEDIATION Faz 7a: numeric robustness of the alignment / profile reader and the
 * "no placeholder geometry" rule. Small inline documents (the shared fixture stays untouched).
 */
class LandXmlParserRobustnessTest {

    private final LandXmlParser parser = new LandXmlParser();

    private static String doc(String alignmentBody) {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
                + "<LandXML xmlns=\"http://www.landxml.org/schema/LandXML-1.2\" version=\"1.2\">"
                + "<Units><Metric linearUnit=\"meter\"/></Units><CoordinateSystem epsgCode=\"32635\"/>"
                + "<Alignments><Alignment name=\"A1\"><CoordGeom>" + alignmentBody + "</CoordGeom></Alignment></Alignments>"
                + "</LandXML>";
    }

    private static String profileDoc(String profAlignBody) {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
                + "<LandXML xmlns=\"http://www.landxml.org/schema/LandXML-1.2\" version=\"1.2\">"
                + "<Units><Metric linearUnit=\"meter\"/></Units><CoordinateSystem epsgCode=\"32635\"/>"
                + "<Alignments><Alignment name=\"A1\"><CoordGeom><Line><Start>0 0</Start><End>0 100</End></Line></CoordGeom>"
                + "<Profile><ProfAlign name=\"P\">" + profAlignBody + "</ProfAlign></Profile></Alignment></Alignments>"
                + "</LandXML>";
    }

    private LandXmlDocument parse(String xml) {
        return parser.parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
    }

    private void assertParseError(String xml, String expectedFragment) {
        LandXmlParseException e = assertThrows(LandXmlParseException.class, () -> parse(xml));
        assertTrue(e.getMessage().contains(expectedFragment), e.getMessage());
    }

    @Test
    void singleTokenCoordinate_isAParseError_withContext() {
        assertParseError(doc("<Line><Start>5</Start><End>0 100</End></Line>"), "Alignment \"A1\" <Line><Start>");
        assertParseError(doc("<Line><Start>0 0</Start><End> </End></Line>"), "<End>");
    }

    @Test
    void nonNumericOrNonFiniteCoordinate_isAParseError() {
        assertParseError(doc("<Line><Start>abc 0</Start><End>0 100</End></Line>"), "is not a number");
        assertParseError(doc("<Line><Start>NaN 0</Start><End>0 100</End></Line>"), "is not a finite number");
        assertParseError(doc("<Line><Start>0 0</Start><End>0 Infinity</End></Line>"), "is not a finite number");
    }

    @Test
    void curveRadius_mustBeFiniteAndPositive() {
        String center = "<Start>0 0</Start><Center>50 0</Center><End>50 50</End>";
        assertParseError(doc("<Curve rot=\"ccw\" radius=\"0\">" + center + "</Curve>"), "radius must be greater than 0");
        assertParseError(doc("<Curve rot=\"ccw\" radius=\"-5\">" + center + "</Curve>"), "radius must be greater than 0");
        assertParseError(doc("<Curve rot=\"ccw\" radius=\"NaN\">" + center + "</Curve>"), "radius");
        assertParseError(doc("<Curve rot=\"ccw\" radius=\"INF\">" + center + "</Curve>"), "radius");
        assertParseError(doc("<Curve rot=\"ccw\" radius=\"abc\">" + center + "</Curve>"), "radius");
        LandXmlDocument ok = parse(doc("<Curve rot=\"ccw\" radius=\"50\">" + center + "</Curve>"));
        assertEquals(1, ok.alignments().get(0).elements().size());
    }

    @Test
    void nonFinitePviOrCurveLength_isAParseError() {
        assertParseError(profileDoc("<PVI>0 100</PVI><PVI>NaN 105</PVI>"), "<PVI> chainage");
        assertParseError(profileDoc("<PVI>0 100</PVI><PVI>100 Infinity</PVI>"), "<PVI> elevation");
        assertParseError(profileDoc("<PVI>0 100</PVI><PVI>100 105</PVI><CircCurve length=\"NaN\"/><PVI>200 100</PVI>"),
                "<CircCurve> length");
        assertParseError(profileDoc("<PVI>0 abc</PVI><PVI>100 105</PVI>"), "is not a number");
    }

    @Test
    void lineOrCurveWithMissingData_producesNoPlaceholderAtTheOrigin_andIsRecordedAsSkipped() {
        LandXmlDocument d = parse(doc("<Line><Start>0 0</Start><End>0 100</End></Line>"
                + "<Line><Start>0 100</Start></Line>"
                + "<Curve rot=\"ccw\"><Start>0 100</Start></Curve>"));
        LandXmlAlignment a = d.alignments().get(0);
        assertEquals(1, a.elements().size(), "only the complete Line is geometry");
        assertEquals(2, a.skipped().size());
        assertEquals(new LandXmlAlignment.SkippedGeometry("Line", 2, 1), a.skipped().get(0));
        assertEquals(new LandXmlAlignment.SkippedGeometry("Curve", 3, 1), a.skipped().get(1));
        assertTrue(a.interiorGaps().isEmpty(), "skipped elements only at the end are not interior gaps");
        assertTrue(d.warnings().stream().anyMatch(w -> w.contains("<Line> missing Start/End")));
        assertTrue(d.warnings().stream().anyMatch(w -> w.contains("<Curve> missing")));
    }

    @Test
    void skippedElementFollowedByGeometry_isAnInteriorGap() {
        LandXmlDocument d = parse(doc("<Line><Start>0 0</Start><End>0 100</End></Line>"
                + "<Spiral length=\"30\"><Start>0 100</Start><End>10 130</End></Spiral>"
                + "<Line><Start>10 130</Start><End>10 200</End></Line>"));
        LandXmlAlignment a = d.alignments().get(0);
        assertEquals(2, a.elements().size());
        assertEquals(1, a.interiorGaps().size());
        assertEquals("Spiral", a.interiorGaps().get(0).kind());
        assertEquals(2, a.interiorGaps().get(0).position());
    }

    @Test
    void trailingSpiral_isNotAnInteriorGap() {
        LandXmlAlignment a = parse(doc("<Line><Start>0 0</Start><End>0 100</End></Line>"
                + "<Spiral length=\"30\"><Start>0 100</Start><End>10 130</End></Spiral>")).alignments().get(0);
        assertEquals(1, a.elements().size());
        assertEquals(1, a.skipped().size());
        assertTrue(a.interiorGaps().isEmpty());
    }
}
