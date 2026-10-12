package com.kopruq.landxml.domain;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import com.kopruq.landxml.model.LandXmlDocument;
import com.kopruq.landxml.model.LandXmlImportResult;
import com.kopruq.landxml.model.LandXmlPvi;

/**
 * BACKEND-REMEDIATION Faz 7b: the vertical profile is attached only when it is unambiguous and fully
 * understood; otherwise {@code profile == null} plus a coded warning. Ground/terrain data is unaffected.
 */
class LandXmlProfileFailClosedTest {

    private final LandXmlParser parser = new LandXmlParser();
    private final LandXmlImportService service = new LandXmlImportService();

    private static String xml(String alignmentAttrs, String profileXml) {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
                + "<LandXML xmlns=\"http://www.landxml.org/schema/LandXML-1.2\" version=\"1.2\">"
                + "<Units><Metric linearUnit=\"meter\"/></Units><CoordinateSystem epsgCode=\"32635\"/>"
                + "<Surfaces><Surface name=\"S\"><Definition surfType=\"TIN\"><Pnts>"
                + "<P id=\"1\">0 0 2</P><P id=\"2\">0 10 7</P><P id=\"3\">10 10 10</P></Pnts>"
                + "<Faces><F>1 2 3</F></Faces></Definition></Surface></Surfaces>"
                + "<Alignments><Alignment name=\"Road A\" " + alignmentAttrs + "><CoordGeom>"
                + "<Line><Start>0 0</Start><End>0 200</End></Line></CoordGeom>"
                + "<Profile>" + profileXml + "</Profile></Alignment></Alignments></LandXML>";
    }

    private static InputStream stream(String xml) {
        return new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8));
    }

    private LandXmlImportResult importWith(String alignmentAttrs, String profileXml) {
        return service.commit(stream(xml(alignmentAttrs, profileXml)), "p", "f.xml", "L", "S", "Road A");
    }

    private static boolean warned(LandXmlImportResult r, String code) {
        return r.warnings().stream().anyMatch(w -> w.contains(code));
    }

    private static final String GOOD = "<ProfAlign name=\"P1\"><PVI>0 100</PVI><PVI>100 105</PVI><CircCurve length=\"20\"/><PVI>200 100</PVI></ProfAlign>";

    // ---- parser

    @Test
    void eachProfAlign_isItsOwnProfile_pvisAreNeverConcatenated() {
        LandXmlDocument d = parser.parse(stream(xml("staStart=\"0\"",
                "<ProfAlign name=\"P1\"><PVI>0 100</PVI><PVI>100 105</PVI></ProfAlign>"
                        + "<ProfAlign name=\"P2\"><PVI>0 50</PVI><PVI>100 60</PVI></ProfAlign>")));
        assertEquals(2, d.profiles().size());
        assertEquals("P1", d.profiles().get(0).name());
        assertEquals(2, d.profiles().get(0).pvis().size());
        assertEquals("P2", d.profiles().get(1).name());
        assertEquals(List.of(new LandXmlPvi(0, 50, 0), new LandXmlPvi(100, 60, 0)), d.profiles().get(1).pvis());
    }

    @Test
    void circCurveWithText_andParaCurves_areMarkedUnsupported_butTheFixtureShapeIsNot() {
        LandXmlDocument fixtureShape = parser.parse(stream(xml("staStart=\"0\"", GOOD)));
        assertTrue(fixtureShape.profiles().get(0).unsupportedReasons().isEmpty());
        assertEquals(new LandXmlPvi(100, 105, 20), fixtureShape.profiles().get(0).pvis().get(1));

        LandXmlDocument withText = parser.parse(stream(xml("staStart=\"0\"",
                "<ProfAlign name=\"P1\"><PVI>0 100</PVI><CircCurve length=\"30\" radius=\"900\">100 105</CircCurve><PVI>200 100</PVI></ProfAlign>")));
        assertTrue(withText.profiles().get(0).hasUnsupportedCurves());
        assertTrue(withText.profiles().get(0).unsupportedReasons().get(0).contains("CircCurve"));

        LandXmlDocument para = parser.parse(stream(xml("staStart=\"0\"",
                "<ProfAlign name=\"P1\"><PVI>0 100</PVI><ParaCurve length=\"30\">100 105</ParaCurve><PVI>200 100</PVI></ProfAlign>")));
        assertTrue(para.profiles().get(0).hasUnsupportedCurves());
        LandXmlDocument unsym = parser.parse(stream(xml("staStart=\"0\"",
                "<ProfAlign name=\"P1\"><PVI>0 100</PVI><UnsymParaCurve lengthIn=\"20\" lengthOut=\"30\">100 105</UnsymParaCurve><PVI>200 100</PVI></ProfAlign>")));
        assertTrue(unsym.profiles().get(0).hasUnsupportedCurves());
    }

    @Test
    void staStart_isRead() {
        assertEquals(0.0, parser.parse(stream(xml("staStart=\"0\"", GOOD))).alignments().get(0).staStart());
        assertEquals(1000.0, parser.parse(stream(xml("staStart=\"1000.5\"", GOOD).replace("1000.5", "1000"))).alignments().get(0).staStart());
        assertNull(parser.parse(stream(xml("", GOOD))).alignments().get(0).staStart());
        assertTrue(parser.parse(stream(xml("staStart=\"abc\"", GOOD))).alignments().get(0).hasUnconfirmedStationOffset());
    }

    // ---- import

    @Test
    void understoodSingleProfile_isImported() {
        LandXmlImportResult r = importWith("staStart=\"0\"", GOOD);
        assertNotNull(r.profile());
        assertEquals(100, r.profile().elevationAt(0), 1e-9);
        assertEquals(105 - 0.0, r.profile().elevationAt(100), 0.5);
    }

    @Test
    void absentStaStart_isNotTreatedAsAnOffset() {
        assertNotNull(importWith("", GOOD).profile());
    }

    @Test
    void multipleProfiles_areNotImported_andWarn() {
        LandXmlImportResult r = importWith("staStart=\"0\"", GOOD
                + "<ProfAlign name=\"P2\"><PVI>0 50</PVI><PVI>100 60</PVI></ProfAlign>");
        assertNull(r.profile());
        assertTrue(warned(r, "MULTIPLE_PROFILES"));
        assertNotNull(r.alignment(), "the horizontal alignment is still imported");
        assertEquals(3, r.terrain().vertices().size());
    }

    @Test
    void unsupportedCurve_isNotImported_andWarns() {
        LandXmlImportResult r = importWith("staStart=\"0\"",
                "<ProfAlign name=\"P1\"><PVI>0 100</PVI><ParaCurve length=\"30\">100 105</ParaCurve><PVI>200 100</PVI></ProfAlign>");
        assertNull(r.profile());
        assertTrue(warned(r, "VERTICAL_CURVE_UNSUPPORTED"));
    }

    @Test
    void nonZeroOrUnreadableStaStart_isNotImported_andWarns() {
        for (String attrs : new String[] {"staStart=\"1000\"", "staStart=\"-5\"", "staStart=\"abc\""}) {
            LandXmlImportResult r = importWith(attrs, GOOD);
            assertNull(r.profile(), attrs);
            assertTrue(warned(r, "STATION_OFFSET_UNCONFIRMED"), attrs);
        }
    }

    @Test
    void invalidPviOrder_isNotImported_andWarns_insteadOfFailingTheImport() {
        LandXmlImportResult r = importWith("staStart=\"0\"",
                "<ProfAlign name=\"P1\"><PVI>0 100</PVI><PVI>150 105</PVI><PVI>100 100</PVI></ProfAlign>");
        assertNull(r.profile());
        assertTrue(warned(r, "VERTICAL_PROFILE_INVALID"));
        assertTrue(warned(r, "strictly increasing"));
        // duplicate chainage, and a single PVI
        assertNull(importWith("staStart=\"0\"", "<ProfAlign name=\"P1\"><PVI>0 100</PVI><PVI>0 105</PVI></ProfAlign>").profile());
        LandXmlImportResult single = importWith("staStart=\"0\"", "<ProfAlign name=\"P1\"><PVI>0 100</PVI></ProfAlign>");
        assertNull(single.profile());
        assertTrue(warned(single, "VERTICAL_PROFILE_INVALID"));
    }

    @Test
    void profileProblems_doNotChangeTheTerrainStatus() {
        // The only warnings are profile ones; the terrain must keep the status it would have without them.
        LandXmlImportResult good = importWith("staStart=\"0\"", GOOD);
        LandXmlImportResult bad = importWith("staStart=\"1000\"", GOOD);
        assertEquals(good.terrain().status(), bad.terrain().status());
    }

    @Test
    void noProfileAtAll_keepsTheExistingWarning() {
        LandXmlImportResult r = importWith("staStart=\"0\"", "");
        assertNull(r.profile());
        assertTrue(warned(r, "has no vertical profile"));
    }
}
