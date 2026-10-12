package com.kopruq.landxml;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * BACKEND-REMEDIATION Faz 7a: an alignment with a skipped element in the MIDDLE is refused
 * (ALIGNMENT_INCOMPLETE); a skipped element at the END is still accepted with the existing warning.
 */
class LandXmlImportServiceGapTest {

    private final LandXmlImportService service = new LandXmlImportService();

    private static InputStream doc(String geometry) {
        String xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
                + "<LandXML xmlns=\"http://www.landxml.org/schema/LandXML-1.2\" version=\"1.2\">"
                + "<Units><Metric linearUnit=\"meter\"/></Units><CoordinateSystem epsgCode=\"32635\"/>"
                + "<Surfaces><Surface name=\"S\"><Definition surfType=\"TIN\"><Pnts>"
                + "<P id=\"1\">0 0 2</P><P id=\"2\">0 10 7</P><P id=\"3\">10 10 10</P></Pnts>"
                + "<Faces><F>1 2 3</F></Faces></Definition></Surface></Surfaces>"
                + "<Alignments><Alignment name=\"Road A\"><CoordGeom>" + geometry + "</CoordGeom></Alignment></Alignments>"
                + "</LandXML>";
        return new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8));
    }

    private LandXmlImportResult importAlignment(String geometry) {
        return service.commit(doc(geometry), "p", "f.xml", "L", "S", "Road A");
    }

    @Test
    void spiralInTheMiddle_isRefused_withTheAlignmentNameAndPosition() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> importAlignment(
                "<Line><Start>0 0</Start><End>0 100</End></Line>"
                        + "<Spiral length=\"30\"><Start>0 100</Start><End>10 130</End></Spiral>"
                        + "<Line><Start>10 130</Start><End>10 200</End></Line>"));
        assertTrue(e.getMessage().startsWith("ALIGNMENT_INCOMPLETE:"), e.getMessage());
        assertTrue(e.getMessage().contains("\"Road A\""), e.getMessage());
        assertTrue(e.getMessage().contains("<Spiral>") && e.getMessage().contains("position 2"), e.getMessage());
    }

    @Test
    void lineWithMissingEnd_inTheMiddle_isRefused() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> importAlignment(
                "<Line><Start>0 0</Start><End>0 100</End></Line>"
                        + "<Line><Start>0 100</Start></Line>"
                        + "<Line><Start>0 200</Start><End>0 300</End></Line>"));
        assertTrue(e.getMessage().startsWith("ALIGNMENT_INCOMPLETE:"), e.getMessage());
        assertTrue(e.getMessage().contains("<Line>") && e.getMessage().contains("position 2"), e.getMessage());
    }

    @Test
    void trailingSpiral_isStillAccepted_withTheExistingWarning() {
        LandXmlImportResult result = importAlignment(
                "<Line><Start>0 0</Start><End>0 100</End></Line>"
                        + "<Spiral length=\"30\"><Start>0 100</Start><End>10 130</End></Spiral>");
        assertNotNull(result.alignment());
        assertEquals(100, result.alignment().totalLengthM(), 1e-9);
        assertTrue(result.warnings().stream().anyMatch(w -> w.contains("Spiral")));
    }

    @Test
    void gapInAnAlignmentThatIsNotSelected_doesNotBlockASurfaceOnlyImport() {
        LandXmlImportResult result = service.commit(doc(
                "<Line><Start>0 0</Start><End>0 100</End></Line><Spiral length=\"30\"><Start>0 100</Start><End>10 130</End></Spiral>"
                        + "<Line><Start>10 130</Start><End>10 200</End></Line>"), "p", "f.xml", "L", "S", null);
        assertEquals(null, result.alignment());
    }

    @Test
    void sampleFixture_spiralAtTheEnd_importsAsBefore() {
        InputStream sample = LandXmlImportServiceGapTest.class.getResourceAsStream("/sample.landxml");
        LandXmlImportResult result = service.commit(sample, "p", "sample.landxml", "L", "Existing Ground", "Main Alignment");
        assertEquals(100 + 50 * Math.PI / 2, result.alignment().totalLengthM(), 1e-3);
    }
}
