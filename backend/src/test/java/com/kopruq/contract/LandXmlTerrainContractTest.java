package com.kopruq.contract;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** BACKEND-REMEDIATION Faz 0b: LandXML, terrain and alignment sampling happy paths. */
class LandXmlTerrainContractTest extends ContractTestSupport {

    @Test
    void landxmlInspect_sampleFixture_snapshot() throws Exception {
        MvcResult r = uploadLandXml("/api/landxml/inspect", sampleLandXml());
        assertEquals(200, r.getResponse().getStatus());
        JsonNode n = body(r);
        assertEquals("meter", n.get("unitsLabel").asText());
        assertEquals("Existing Ground", n.get("surfaceNames").get(0).asText());
        assertEquals("Main Alignment", n.get("alignmentNames").get(0).asText());
        assertEquals("Design Profile", n.get("profileNames").get(0).asText());
        assertEquals(1, n.get("warnings").size());
        assertTrue(n.get("warnings").get(0).asText().contains("Spiral"));
        assertEquals(4, n.get("surfaces").get(0).get("points").asInt());
        assertEquals(2, n.get("surfaces").get(0).get("faces").asInt());
    }

    @Test
    void landxmlImport_sampleFixture_summarySnapshot() throws Exception {
        MvcResult r = importSample("Main Alignment");
        assertEquals(200, r.getResponse().getStatus());
        JsonNode n = body(r);
        assertEquals(4, n.get("pointCount").asInt());
        assertEquals(2, n.get("triangleCount").asInt());
        assertTrue(n.get("hasAlignment").asBoolean());
        assertEquals(100 + 50 * Math.PI / 2, n.get("alignmentLengthM").asDouble(), 1e-9);
        assertTrue(n.get("hasProfile").asBoolean());
        assertEquals("REVIEW_REQUIRED", n.get("status").asText());
        assertEquals(1, n.get("warnings").size());
        assertTrue(n.hasNonNull("id") && n.hasNonNull("terrainId"));
    }

    @Test
    void landxmlProfile_andAlignmentSample_andTerrainEndpointsShareTheImport() throws Exception {
        JsonNode imp = body(importSample("Main Alignment"));
        String id = imp.get("id").asText();
        String terrainId = imp.get("terrainId").asText();

        JsonNode profile = getOk("/api/landxml/" + id + "/profile?stepM=50");
        assertEquals(5, profile.size());
        assertEquals(100.0, profile.get(0).get("designElevationM").asDouble(), 1e-9);
        assertEquals(2.0, profile.get(0).get("groundElevationM").asDouble(), 1e-9);
        assertEquals(102.5, profile.get(1).get("designElevationM").asDouble(), 1e-9);
        assertEquals(104.5, profile.get(2).get("designElevationM").asDouble(), 1e-9);
        assertEquals("[chainageM, groundElevationM, designElevationM]", names(profile.get(0)));

        JsonNode sample = getOk("/api/alignment/" + id + "/sample?stepM=0");
        assertEquals(21, sample.size());
        assertEquals(26.780972450961727, sample.get(3).get("xM").asDouble(), 1e-9);
        assertEquals("[xM, yM, chainageM]", names(sample.get(0)));

        assertEquals(6.0, getOk("/api/terrain/" + terrainId + "/elevation?x=5&y=5").get("elevationM").asDouble(), 1e-9);
        assertTrue(getOk("/api/terrain/" + terrainId + "/elevation?x=500&y=5").get("elevationM").isNull());
        JsonNode mesh = getOk("/api/terrain/" + terrainId + "/mesh");
        assertEquals(12, mesh.get("positions").size());
        assertEquals(6, mesh.get("indices").size());
    }

    @Test
    void terrainXyzImport_meshBinAndElevation_snapshot() throws Exception {
        MvcResult r = uploadXyz("0 0 1\n10 0 2\n0 10 3\n10 10 4\n");
        assertEquals(200, r.getResponse().getStatus());
        JsonNode n = body(r);
        assertEquals(4, n.get("pointCount").asInt());
        assertEquals(2, n.get("triangleCount").asInt());
        assertEquals(0.0, n.get("minXM").asDouble(), 0);
        assertEquals(10.0, n.get("maxXM").asDouble(), 0);
        assertEquals(1.0, n.get("minElevationM").asDouble(), 0);
        assertEquals(4.0, n.get("maxElevationM").asDouble(), 0);
        assertEquals(4, n.get("previewPoints").size());
        String id = n.get("id").asText();

        assertEquals(2.5, getOk("/api/terrain/" + id + "/elevation?x=5&y=5").get("elevationM").asDouble(), 1e-9);

        MvcResult started = mvc.perform(MockMvcRequestBuilders.get("/api/terrain/" + id + "/mesh.bin")).andReturn();
        MvcResult done = mvc.perform(MockMvcRequestBuilders.asyncDispatch(started)).andReturn();
        assertEquals(200, done.getResponse().getStatus());
        assertEquals(112, done.getResponse().getContentAsByteArray().length);
    }

    // ---- Faz 7a: robustness of the alignment reader, seen through REST.

    private static byte[] withAlignment(String geometry) throws Exception {
        String xml = new String(sampleLandXml(), java.nio.charset.StandardCharsets.UTF_8);
        int from = xml.indexOf("<CoordGeom>") + "<CoordGeom>".length();
        int to = xml.indexOf("</CoordGeom>");
        return (xml.substring(0, from) + geometry + xml.substring(to)).getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private MvcResult importBytes(byte[] xml) throws Exception {
        return uploadLandXml("/api/landxml/import", xml, "projectId", "p1", "coordinateSystemLabel", "Local",
                "surfaceName", "Existing Ground", "coordinateOrder", "FIRST_Y_SECOND_X", "alignmentName", "Main Alignment");
    }

    @Test
    void landxmlImport_skippedElementInTheMiddle_is400AlignmentIncomplete() throws Exception {
        MvcResult r = importBytes(withAlignment("<Line><Start>0 0</Start><End>0 100</End></Line>"
                + "<Spiral length=\"30\"><Start>0 100</Start><End>10 130</End></Spiral>"
                + "<Line><Start>10 130</Start><End>10 200</End></Line>"));
        assertEquals(400, r.getResponse().getStatus());
        JsonNode n = body(r);
        assertEquals("INVALID_INPUT", n.get("code").asText());
        assertTrue(n.get("message").asText().startsWith("ALIGNMENT_INCOMPLETE:"));
        assertTrue(n.get("message").asText().contains("Main Alignment"));
    }

    @Test
    void landxmlImport_and_inspect_badNumbers_are400InvalidLandxml() throws Exception {
        byte[] bad = withAlignment("<Line><Start>5</Start><End>0 100</End></Line>");
        MvcResult imp = importBytes(bad);
        assertEquals(400, imp.getResponse().getStatus());
        assertEquals("INVALID_LANDXML", body(imp).get("code").asText());
        MvcResult insp = uploadLandXml("/api/landxml/inspect", bad);
        assertEquals(400, insp.getResponse().getStatus());
        assertEquals("INVALID_LANDXML", body(insp).get("code").asText());

        MvcResult radius = importBytes(withAlignment("<Curve rot=\"ccw\" radius=\"0\"><Start>0 0</Start>"
                + "<Center>50 0</Center><End>50 50</End></Curve>"));
        assertEquals(400, radius.getResponse().getStatus());
        assertTrue(body(radius).get("message").asText().contains("radius"));
    }

    // ---- Faz 7b: ambiguous / short profiles are not shown as design elevations.

    private static byte[] withProfile(String profileXml) throws Exception {
        String xml = new String(sampleLandXml(), java.nio.charset.StandardCharsets.UTF_8);
        int from = xml.indexOf("<Profile>") + "<Profile>".length();
        int to = xml.indexOf("</Profile>");
        return (xml.substring(0, from) + profileXml + xml.substring(to)).getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    @Test
    void landxmlImport_multipleProfAligns_hasProfileFalse_withWarning() throws Exception {
        MvcResult r = importBytes(withProfile("<ProfAlign name=\"A\"><PVI>0 100</PVI><PVI>100 105</PVI></ProfAlign>"
                + "<ProfAlign name=\"B\"><PVI>0 50</PVI><PVI>100 60</PVI></ProfAlign>"));
        assertEquals(200, r.getResponse().getStatus());
        JsonNode n = body(r);
        assertFalse(n.get("hasProfile").asBoolean());
        assertTrue(n.get("hasAlignment").asBoolean());
        assertTrue(n.get("warnings").toString().contains("MULTIPLE_PROFILES"));
    }

    @Test
    void landxmlImport_unsupportedCurve_and_stationOffset_andBadPviOrder_giveHasProfileFalse() throws Exception {
        MvcResult para = importBytes(withProfile("<ProfAlign name=\"A\"><PVI>0 100</PVI><ParaCurve length=\"20\">100 105</ParaCurve><PVI>200 100</PVI></ProfAlign>"));
        assertFalse(body(para).get("hasProfile").asBoolean());
        assertTrue(body(para).get("warnings").toString().contains("VERTICAL_CURVE_UNSUPPORTED"));

        String offset = new String(sampleLandXml(), java.nio.charset.StandardCharsets.UTF_8).replace("staStart=\"0\"", "staStart=\"500\"");
        MvcResult sta = importBytes(offset.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertFalse(body(sta).get("hasProfile").asBoolean());
        assertTrue(body(sta).get("warnings").toString().contains("STATION_OFFSET_UNCONFIRMED"));

        MvcResult order = importBytes(withProfile("<ProfAlign name=\"A\"><PVI>100 100</PVI><PVI>0 105</PVI></ProfAlign>"));
        assertFalse(body(order).get("hasProfile").asBoolean());
        assertTrue(body(order).get("warnings").toString().contains("VERTICAL_PROFILE_INVALID"));
    }

    @Test
    void landxmlProfile_designElevationIsNullOutsideThePviRange() throws Exception {
        // The alignment is 178.54 m long but this profile only spans chainage 0..100.
        JsonNode imp = body(importBytes(withProfile("<ProfAlign name=\"A\"><PVI>0 100</PVI><PVI>100 105</PVI></ProfAlign>")));
        assertTrue(imp.get("hasProfile").asBoolean());
        JsonNode profile = getOk("/api/landxml/" + imp.get("id").asText() + "/profile?stepM=50");
        assertEquals(100.0, profile.get(0).get("designElevationM").asDouble(), 1e-9);
        assertEquals(102.5, profile.get(1).get("designElevationM").asDouble(), 1e-9);
        assertEquals(105.0, profile.get(2).get("designElevationM").asDouble(), 1e-9);
        assertTrue(profile.get(3).get("designElevationM").isNull(), "chainage 150 is beyond the last PVI");
        assertTrue(profile.get(4).get("designElevationM").isNull());
        assertFalse(profile.get(3).get("groundElevationM") == null);
    }

    // ---- Faz 7c: XYZ / terrain data integrity.

    @Test
    void xyzImport_cleanFile_hasImportedStatusAndNoWarnings() throws Exception {
        JsonNode n = body(uploadXyz("0 0 1\n10 0 2\n0 10 3\n10 10 4\n"));
        assertEquals("IMPORTED", n.get("status").asText());
        assertEquals(0, n.get("warnings").size());
    }

    @Test
    void xyzImport_bomFirstLine_isImported_nonFiniteRowsSkippedAndCounted() throws Exception {
        JsonNode n = body(uploadXyz("\uFEFF0 0 1\n10 0 2\n0 10 3\n10 10 4\nNaN 5 5\n5 Infinity 5\n"));
        assertEquals(4, n.get("pointCount").asInt());
        assertEquals(1.0, n.get("minElevationM").asDouble(), 0);
        assertTrue(n.get("warnings").toString().contains("2 row(s) containing NaN or an infinite value were skipped"));
    }

    @Test
    void xyzImport_conflictingZ_fewPoints_wideRows_areReviewRequired() throws Exception {
        JsonNode conflict = body(uploadXyz("0 0 1\n10 0 2\n0 10 3\n10 10 4\n0 0 9\n"));
        assertEquals("REVIEW_REQUIRED", conflict.get("status").asText());
        assertEquals(4, conflict.get("pointCount").asInt());
        assertEquals(1.0, conflict.get("previewPoints").get(0).get("z").asDouble(), 0, "first occurrence is still kept");
        assertTrue(conflict.get("warnings").get(0).asText().contains("different elevations"));

        JsonNode few = body(uploadXyz("0 0 1\n10 0 2\n"));
        assertEquals("REVIEW_REQUIRED", few.get("status").asText());
        assertEquals(0, few.get("triangleCount").asInt());

        JsonNode wide = body(uploadXyz("1,5 2,5 3,5\n10,5 0,5 2,5\n0,5 10,5 3,5\n"));
        assertEquals("REVIEW_REQUIRED", wide.get("status").asText());
        assertTrue(wide.get("warnings").toString().contains("more than three numeric columns"));
    }

    @Test
    void terrainElevation_nonFiniteQuery_isNull() throws Exception {
        String id = body(uploadXyz("0 0 1\n10 0 2\n0 10 3\n10 10 4\n")).get("id").asText();
        assertTrue(getOk("/api/terrain/" + id + "/elevation?x=NaN&y=5").get("elevationM").isNull());
        assertTrue(getOk("/api/terrain/" + id + "/elevation?x=5&y=Infinity").get("elevationM").isNull());
        assertEquals(2.5, getOk("/api/terrain/" + id + "/elevation?x=5&y=5").get("elevationM").asDouble(), 1e-9);
    }

    @Test
    void terrainUnknownId_is404WithMessage() throws Exception {
        MvcResult r = get("/api/terrain/nope/mesh");
        assertEquals(404, r.getResponse().getStatus());
        assertEquals("No terrain with id nope", messageOf(r));
    }

    @Test
    void alignmentSample_postAndGet_snapshot() throws Exception {
        JsonNode post = postJsonOk("/api/alignment/sample",
                "{\"startXM\":0,\"startYM\":0,\"endXM\":100,\"endYM\":0,\"stepM\":25}");
        assertEquals(5, post.size());
        assertEquals(75.0, post.get(3).get("xM").asDouble(), 1e-12);
        assertEquals(100.0, post.get(4).get("chainageM").asDouble(), 1e-12);
    }

    @Test
    void alignmentSample_unknownImport_is404() throws Exception {
        MvcResult r = get("/api/alignment/missing/sample");
        assertEquals(404, r.getResponse().getStatus());
        assertEquals("No LandXML import with id missing", messageOf(r));
    }

    private static String names(JsonNode node) {
        var list = new java.util.ArrayList<String>();
        node.fieldNames().forEachRemaining(list::add);
        return list.toString();
    }
}
